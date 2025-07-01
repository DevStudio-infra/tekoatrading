import os
import json
import base64
import gc
import time
import traceback
from io import BytesIO
import matplotlib
# Use the Agg backend which is non-interactive and doesn't require GUI
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import mplfinance as mpf
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uvicorn
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Trade Tracker Chart Engine")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models with validation
class OHLCVData(BaseModel):
    datetime: str
    open: float
    high: float
    low: float
    close: float
    volume: float

class ChartRequest(BaseModel):
    data: List[OHLCVData] = Field(..., description="OHLCV data points", max_items=500)
    chart_type: str = Field("candle", description="Chart type (candle, line, ohlc)")
    width: int = Field(1200, description="Chart width in pixels", gt=0, le=2000)
    height: int = Field(800, description="Chart height in pixels", gt=0, le=2000)
    indicators: Optional[Dict[str, Dict[str, Any]]] = Field(None, description="Technical indicators")
    separate_oscillators: bool = Field(True, description="Whether to place oscillators in separate panels")

# Helper function to convert data to pandas DataFrame with error handling
def convert_to_dataframe(data: List[OHLCVData]) -> pd.DataFrame:
    try:
        # Create dataframe from model dictionaries
        df = pd.DataFrame([d.dict() for d in data])

        # Convert datetime strings to pandas datetime objects
        # Handle both timestamp integers and date strings
        if df['datetime'].dtype == 'int64' or df['datetime'].dtype == 'float64':
            # Timestamps in milliseconds need to be converted to seconds for pandas
            df['datetime'] = pd.to_datetime(df['datetime'], unit='ms')
        else:
            # Handle ISO format strings
            df['datetime'] = pd.to_datetime(df['datetime'])

        # Set datetime as index
        df.set_index('datetime', inplace=True)

        logging.info(f"Successfully created DataFrame with {len(df)} rows")
        return df
    except Exception as e:
        logging.error(f"Error converting data to DataFrame: {str(e)}")
        raise ValueError(f"Failed to process candle data: {str(e)}")

# Helper function to add technical indicators with performance optimizations
def add_indicators(df: pd.DataFrame, indicators: Dict[str, Dict[str, Any]]) -> List[mpf.make_addplot]:
    """Add technical indicators to the dataframe with improved performance"""
    addplots = []

    if not indicators:
        return addplots

    # Check if we have sufficient data points
    data_points = len(df)
    if data_points < 5:
        logging.warning(f"Insufficient data points ({data_points}) for indicator calculations. Skipping indicators.")
        return addplots

    start_time = time.time()
    total_indicators = len(indicators)
    processed = 0

    # Track which oscillator types we've seen to assign proper panels
    oscillator_types = ['macd', 'rsi', 'atr', 'stochastic']
    panel_assignments = {}
    next_panel = 2  # Start at panel 2 (panel 1 reserved for volume)

    # Limit total indicators to prevent performance issues
    if total_indicators > 8:
        logging.warning(f"Too many indicators requested ({total_indicators}). Limiting to 8.")
        # Take only the first 8 indicator keys
        indicator_keys = list(indicators.keys())[:8]
        indicators = {k: indicators[k] for k in indicator_keys}

    for indicator_name, params in indicators.items():
        try:
            processed += 1
            logging.info(f"Processing indicator {processed}/{len(indicators)}: {indicator_name}")

            # Each indicator calculation is wrapped with error handling
            if indicator_name.lower() == 'sma':
                period = params.get('period', 20)
                color = params.get('color', 'blue')
                # Ensure we have enough data for SMA calculation
                effective_period = min(period, max(1, len(df) - 1))
                if effective_period >= 1:
                    sma_values = df['close'].rolling(window=effective_period).mean()
                    # Only add if we have valid values
                    if not sma_values.dropna().empty:
                        df[f'SMA_{period}'] = sma_values
                        addplots.append(mpf.make_addplot(df[f'SMA_{period}'], color=color))

            # ATR indicator
            if indicator_name.lower() == 'atr':
                period = params.get('period', 14)
                color = params.get('color', 'brown')
                # Ensure we have enough data for ATR calculation
                effective_period = min(period, max(2, len(df) - 1))
                if len(df) >= effective_period + 1:  # Need at least period+1 for ATR
                    # Calculate ATR
                    tr1 = abs(df['high'] - df['low'])
                    tr2 = abs(df['high'] - df['close'].shift())
                    tr3 = abs(df['low'] - df['close'].shift())
                    tr = pd.DataFrame({'tr1': tr1, 'tr2': tr2, 'tr3': tr3}).max(axis=1)
                    atr_values = tr.rolling(window=effective_period).mean()
                    # Only add if we have valid values
                    if not atr_values.dropna().empty:
                        df['ATR'] = atr_values
                        # Use a separate panel for ATR
                        addplots.append(mpf.make_addplot(df['ATR'], panel=3, color=color, ylabel='ATR'))
            elif indicator_name.lower() == 'rsi':
                period = params.get('period', 14)
                color = params.get('color', 'purple')
                # Ensure we have enough data for RSI calculation
                effective_period = min(period, max(2, len(df) - 1))
                if len(df) >= effective_period + 1:  # Need at least period+1 for RSI
                    # Calculate RSI directly
                    delta = df['close'].diff()
                    gain = delta.where(delta > 0, 0)
                    loss = -delta.where(delta < 0, 0)
                    avg_gain = gain.rolling(window=effective_period).mean()
                    avg_loss = loss.rolling(window=effective_period).mean()
                    # Avoid division by zero
                    rs = avg_gain / avg_loss.replace(0, 1e-10)
                    rsi_values = 100 - (100 / (1 + rs))
                    # Only add if we have valid values
                    if not rsi_values.dropna().empty:
                        df['RSI'] = rsi_values
                        # Use a separate panel for RSI
                        addplots.append(mpf.make_addplot(df['RSI'], panel=2, color=color, ylabel='RSI'))

            elif indicator_name.lower() == 'ema':
                period = params.get('period', 20)
                color = params.get('color', 'red')
                # Ensure we have enough data for EMA calculation
                effective_period = min(period, max(1, len(df) - 1))
                if effective_period >= 1:
                    ema_values = df['close'].ewm(span=effective_period, adjust=False).mean()
                    # Only add if we have valid values
                    if not ema_values.dropna().empty:
                        df[f'EMA_{period}'] = ema_values
                        addplots.append(mpf.make_addplot(df[f'EMA_{period}'], color=color))

            elif indicator_name.lower() in ['bollinger', 'bb', 'bollingerbands']:
                period = params.get('period', 20)
                std_dev = params.get('stdDev', params.get('std_dev', 2))

                logging.info(f"🎯 Processing Bollinger Bands: period={period}, stdDev={std_dev}")

                # Use smaller window if dataset is small, but ensure minimum of 2
                window = min(period, max(2, len(df) - 1))

                logging.info(f"🎯 BB window size: {window}, DataFrame length: {len(df)}")

                if len(df) >= window:
                    bb_middle = df['close'].rolling(window=window).mean()
                    bb_std = df['close'].rolling(window=window).std()
                    bb_upper = bb_middle + std_dev * bb_std
                    bb_lower = bb_middle - std_dev * bb_std

                    # Only add if we have valid values
                    if not bb_middle.dropna().empty and not bb_std.dropna().empty:
                        df[f'BB_middle_{period}'] = bb_middle
                        df[f'BB_upper_{period}'] = bb_upper
                        df[f'BB_lower_{period}'] = bb_lower

                        addplots.append(mpf.make_addplot(df[f'BB_upper_{period}'], color='green', linestyle='--'))
                        addplots.append(mpf.make_addplot(df[f'BB_middle_{period}'], color='blue'))
                        addplots.append(mpf.make_addplot(df[f'BB_lower_{period}'], color='green', linestyle='--'))

                        logging.info(f"✅ Successfully added Bollinger Bands to chart: {len([x for x in [bb_middle, bb_upper, bb_lower] if not x.dropna().empty])} bands")
                    else:
                        logging.warning(f"❌ BB calculation failed - empty values. Middle empty: {bb_middle.dropna().empty}, Std empty: {bb_std.dropna().empty}")
                else:
                    logging.warning(f"❌ Insufficient data for BB: need {window}, have {len(df)}")

            elif indicator_name.lower() == 'macd':
                fast = min(params.get('fast', 12), len(df)//4)
                slow = min(params.get('slow', 26), len(df)//3)
                signal = min(params.get('signal', 9), len(df)//5)

                # Ensure we have enough data for MACD calculation
                if len(df) >= max(fast, slow, signal) + 1:
                    # Calculate MACD components more efficiently
                    df[f'EMA_fast'] = df['close'].ewm(span=fast, adjust=False).mean()
                    df[f'EMA_slow'] = df['close'].ewm(span=slow, adjust=False).mean()
                    df['MACD_line'] = df[f'EMA_fast'] - df[f'EMA_slow']
                    df['MACD_signal'] = df['MACD_line'].ewm(span=signal, adjust=False).mean()
                    df['MACD_histogram'] = df['MACD_line'] - df['MACD_signal']

                    # Only add if we have valid values
                    if not df['MACD_line'].dropna().empty:
                        # Create panel for MACD
                        addplots.append(mpf.make_addplot(df['MACD_line'], panel=1, color='blue'))
                        addplots.append(mpf.make_addplot(df['MACD_signal'], panel=1, color='red'))
                        addplots.append(mpf.make_addplot(df['MACD_histogram'], panel=1, type='bar', color='green'))
        except Exception as e:
            logging.error(f"Error calculating indicator {indicator_name}: {str(e)}")
            # Continue processing other indicators instead of failing completely

    logging.info(f"Added {len(addplots)} indicator components to chart in {time.time() - start_time:.2f} seconds")
    return addplots

def cleanup_resources():
    """Clean up matplotlib resources to prevent memory leaks"""
    plt.close('all')
    gc.collect()

@app.post("/generate-chart")
async def generate_chart(request: ChartRequest, background_tasks: BackgroundTasks):
    start_time = time.time()
    logging.info(f"Received chart request with {len(request.data)} data points")

    try:
        # Add cleanup to background tasks to ensure resources are released
        background_tasks.add_task(cleanup_resources)

        # Limit data points to prevent performance issues
        if len(request.data) > 400:  # Increased cap to 400 candles for better analysis
            logging.warning(f"Limiting request from {len(request.data)} to 400 data points")
            request.data = request.data[-400:]  # Use most recent 400 points

        # Convert data to pandas DataFrame
        df = convert_to_dataframe(request.data)

        # Check if DataFrame is not empty
        if df.empty:
            raise HTTPException(status_code=400, detail="Empty data provided")

        logging.info(f"Data processing completed in {time.time() - start_time:.2f} seconds")

        # Set up matplotlib figure with controlled dimensions
        width = min(request.width, 1600)  # Cap width
        height = min(request.height, 1200)  # Cap height
        plt.figure(figsize=(width/100, height/100), dpi=100)

        # Prepare chart style and kwargs
        chart_style = 'yahoo'
        chart_type = request.chart_type
        volume = True

        # Ensure supported chart type
        if chart_type not in ['candle', 'line', 'ohlc', 'hollow_and_filled']:
            chart_type = 'candle'

        # Measure indicator processing time
        indicator_start = time.time()

        # Add technical indicators if specified
        addplots = add_indicators(df, request.indicators) if request.indicators else []

        # Process oscillator panels to ensure they're in separate panels
        if request.indicators and request.separate_oscillators:
            # First, identify all unique oscillator types in the addplots
            oscillator_types = ['macd', 'rsi', 'atr', 'stochastic']
            oscillator_groups = {}

            # Group plots by oscillator type
            for i, plot in enumerate(addplots):
                plot_name = getattr(plot, 'name', '').lower()

                # Skip plots that already have panel assignments
                if hasattr(plot, 'panel') and plot.panel is not None:
                    continue

                # Find which oscillator type this plot belongs to
                for osc_type in oscillator_types:
                    if osc_type in plot_name:
                        if osc_type not in oscillator_groups:
                            oscillator_groups[osc_type] = []
                        oscillator_groups[osc_type].append(i)
                        break

            # Now assign panels, starting from panel 2 (after volume panel)
            panel_count = 2  # Start after volume panel (which is 1)

            # Assign each oscillator type to its own panel
            for osc_type, plot_indices in oscillator_groups.items():
                for idx in plot_indices:
                    addplots[idx].panel = panel_count
                panel_count += 1  # Move to next panel for next oscillator type

        logging.info(f"Indicator processing completed in {time.time() - indicator_start:.2f} seconds")

        # Create a BytesIO object to save the figure
        buf = BytesIO()

        # Measure chart rendering time
        plot_start = time.time()

        # Determine if we need multi-panel display (for oscillators)
        has_secondary_panels = False
        oscillator_panels = 0
        if request.indicators and addplots:
            # Check for oscillator indicators that need separate panels
            oscillator_indicators = ['macd', 'rsi', 'atr', 'stochastic']
            present_oscillators = [k.lower() for k in request.indicators.keys() if k.lower() in oscillator_indicators]
            has_secondary_panels = len(present_oscillators) > 0 or volume
            oscillator_panels = len(present_oscillators)
            logging.info(f"Chart has {oscillator_panels} oscillator panels: {present_oscillators}")

        # Set up plot kwargs
        plot_kwargs = {
            'type': chart_type,
            'style': chart_style,
            'volume': volume,
            'addplot': addplots,
            'savefig': dict(fname=buf, dpi=100, bbox_inches='tight'),
            'tight_layout': True,  # Optimize layout
            'figsize': (width/100, height/100),
        }

        # Always place volume in panel 1 when separate_oscillators is true
        if volume and request.separate_oscillators:
            plot_kwargs['volume_panel'] = 1  # Place volume in panel 1 (separate from main panel 0)

        # Configure panel ratios based on number of oscillator panels
        if request.separate_oscillators:
            # Count how many panels we need in total
            # Start with main price panel
            panels_needed = 1

            # Add volume panel if enabled
            if volume:
                panels_needed += 1

            # Find the highest panel number used in addplots
            max_panel = 0
            for plot in addplots:
                if hasattr(plot, 'panel') and plot.panel is not None:
                    max_panel = max(max_panel, plot.panel)

            # Total panels needed is the maximum of:
            # 1. panels_needed calculated above
            # 2. max_panel + 1 (since panels are 0-indexed)
            total_panels = max(panels_needed, max_panel + 1)

            # Create panel ratios array
            # Main panel gets 4x height, other panels get 1x each
            panel_ratios = [4]  # Main price panel

            # Add ratios for all other panels
            for _ in range(1, total_panels):
                panel_ratios.append(1)

            plot_kwargs['panel_ratios'] = tuple(panel_ratios)

        # Generate the chart with controlled parameters
        mpf.plot(df, **plot_kwargs)

        logging.info(f"Chart rendering completed in {time.time() - plot_start:.2f} seconds")

        # Convert the plot to a base64 string
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode()

        # Close plot to free memory right away
        plt.close('all')

        # Return the result
        total_time = time.time() - start_time
        logging.info(f"Total chart generation completed in {total_time:.2f} seconds")

        return {
            "success": True,
            "chart_image": img_base64,
            "chart_type": chart_type,
            "width": width,
            "height": height,
            "processing_time": round(total_time, 2)
        }
    except Exception as e:
        # Log the full exception with traceback
        logging.error(f"Error generating chart: {str(e)}")
        logging.error(traceback.format_exc())

        # Always close plots in case of error
        plt.close('all')

        # Return a proper error response
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "detail": "Chart generation failed"
            }
        )

@app.get("/")
async def root():
    return {
        "message": "Trade Tracker Chart Engine API",
        "status": "running",
        "memory_usage": f"{gc.collect()} objects collected"
    }

@app.get("/ping")
async def ping():
    """Simple health check endpoint"""
    return {"status": "ok", "timestamp": time.time()}

@app.get("/chart-status")
async def chart_status():
    """Chart engine status endpoint - expected by sophisticated chart service"""
    return {
        "status": "ready",
        "engine": "mplfinance",
        "version": "1.0.0",
        "uptime": time.time() - START_TIME,
        "memory_collected": gc.collect()
    }

@app.get("/health")
async def health():
    """Health check endpoint for fallback server management"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "uptime": time.time() - START_TIME
    }

@app.get("/stats")
async def stats():
    """Return some basic stats about the chart engine"""
    gc.collect()  # Run garbage collection
    return {
        "status": "running",
        "uptime": time.time() - START_TIME,
        "python_version": os.sys.version,
        "matplotlib_version": matplotlib.__version__,
        "mplfinance_version": mpf.__version__,
        "memory_info": "Memory stats collection not available"
    }

# Track server start time
START_TIME = time.time()

# Run the server if executed directly
if __name__ == "__main__":
    port = int(os.getenv("CHART_ENGINE_PORT", 5001))
    host = os.getenv("CHART_ENGINE_HOST", "0.0.0.0")  # Changed to accept all connections

    # Log startup information
    logging.info(f"Starting chart engine on {host}:{port}")
    logging.info(f"Python version: {os.sys.version}")
    logging.info(f"Matplotlib version: {matplotlib.__version__}")
    logging.info(f"MPLFinance version: {mpf.__version__}")

    # Configure uvicorn with worker settings
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,  # Disable auto-reload for production
        workers=1,  # Use only 1 worker due to matplotlib limitations
        timeout_keep_alive=30  # Reduce keep-alive time
    )
