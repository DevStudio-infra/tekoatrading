"""
Generate candlestick chart from JSON data
Uses mplfinance to create a candlestick chart with indicators
Supports the multi-pane chart architecture with:
- Main price chart: candlesticks with overlay indicators (MA, BB)
- Separate oscillator panes: MACD, RSI, ATR, Stochastic
"""
import sys
import json
import mplfinance as mpf
import pandas as pd
import io
from datetime import datetime
import matplotlib.pyplot as plt
import numpy as np
import traceback
from utils import add_indicators

def print_df_sample(df, sample_size=5):
    """Print a small sample of the DataFrame for debugging purposes"""
    if len(df) > 0:
        print(f"DataFrame sample (first {min(sample_size, len(df))} rows):", file=sys.stderr)
        print(df.head(sample_size), file=sys.stderr)
        
        # Print the last few rows too
        if len(df) > sample_size:
            print(f"DataFrame sample (last {min(sample_size, len(df))} rows):", file=sys.stderr)
            print(df.tail(sample_size), file=sys.stderr)

def main():
    try:
        print("Python candlestick chart generator starting...", file=sys.stderr)
        
        # Read data from stdin or command line arguments
        if len(sys.argv) > 1:
            data = json.loads(sys.argv[1])
        else:
            data = json.load(sys.stdin)
        
        # Debug data received
        print(f"Received data with {len(data.get('candles', []))} candles", file=sys.stderr)
        if 'indicators' in data:
            print(f"Found {len(data['indicators'])} indicators in data", file=sys.stderr)
            for idx, ind in enumerate(data['indicators'][:5]):  # Print first 5 indicators
                print(f"Indicator {idx}: type={ind.get('type', 'unknown')}, params={ind.get('params', {})}", file=sys.stderr)
        
        # Convert candles to pandas DataFrame
        candles = data.get('candles', [])
        
        # Create DataFrame from candles
        df = pd.DataFrame(candles)
        
        # Debug DataFrame columns
        print(f"DataFrame columns: {list(df.columns)}", file=sys.stderr)
        
        # Convert time field to datetime - field might be called 'time' not 'datetime'
        # Handle both UNIX timestamps (numbers) and ISO string dates
        if 'time' in df.columns:
            print("Found 'time' column in DataFrame", file=sys.stderr)
            if isinstance(df['time'].iloc[0], (int, float)):
                print("Converting numeric timestamps to datetime", file=sys.stderr)
                # Convert UNIX timestamp to datetime - milliseconds to seconds
                df['datetime'] = pd.to_datetime(df['time'], unit='ms')
            else:
                print("Converting string dates to datetime", file=sys.stderr)
                # Convert string date to datetime
                df['datetime'] = pd.to_datetime(df['time'])
            
            # Set datetime as index and ensure OHLCV columns are present
            df.set_index('datetime', inplace=True)
            print(f"Set datetime index. New index: {df.index.name}", file=sys.stderr)
            
            # Ensure the index is sorted in ascending order for proper plotting
            df = df.sort_index()
            print(f"Sorted DataFrame by datetime index", file=sys.stderr)
            
            # Clean up the DataFrame (drop duplicate or non-datetime indices)
            if df.index.duplicated().any():
                print(f"WARNING: Found {df.index.duplicated().sum()} duplicate timestamps, keeping first occurrences", file=sys.stderr)
                df = df[~df.index.duplicated(keep='first')]
        else:
            # Fallback to integer index if no time column is found
            print("WARNING: No time column found, using row numbers as index", file=sys.stderr)
            print(f"Available columns: {list(df.columns)}", file=sys.stderr)
        
        # Print a sample of the DataFrame for debugging
        print_df_sample(df)
        
        # Check for invalid values that might cause plotting issues
        nan_columns = df.columns[df.isna().any()].tolist()
        if nan_columns:
            print(f"WARNING: NaN values found in columns {nan_columns}. Filling with forward/backward fill.", file=sys.stderr)
            df = df.ffill().bfill()
        
        # Ensure all required columns exist
        required_columns = ['open', 'high', 'low', 'close']
        for col in required_columns:
            if col not in df.columns:
                print(f"Error: Required column '{col}' not found in data. Columns: {list(df.columns)}", file=sys.stderr)
                sys.exit(1)
        
        # Add volume if it exists
        if 'volume' in df.columns:
            volume = True
            print("Volume data found", file=sys.stderr)
        else:
            volume = False
            df['volume'] = 0
            print("No volume data, using zeros", file=sys.stderr)
        
        # Configure plot style
        dark_mode = data.get('darkMode', True)
        style = 'nightclouds' if dark_mode else 'yahoo'
        print(f"Using style: {style} (darkMode: {dark_mode})", file=sys.stderr)
        
        # Create a custom style dictionary based on the selected style
        if dark_mode:
            mc = mpf.make_marketcolors(up='#00ff00', down='#ff0000', 
                                      edge='inherit', wick='inherit', 
                                      volume='#0000ff')
            custom_style = mpf.make_mpf_style(base_mpf_style='nightclouds', 
                                             marketcolors=mc,
                                             gridstyle=":",
                                             rc={'axes.labelcolor': 'white',
                                                'axes.edgecolor': 'white',
                                                'ytick.color': 'white',
                                                'xtick.color': 'white',
                                                'figure.facecolor': '#121212',
                                                'axes.facecolor': '#121212'})
        else:
            mc = mpf.make_marketcolors(up='g', down='r', 
                                      edge='inherit', wick='inherit', 
                                      volume='b')
            custom_style = mpf.make_mpf_style(base_mpf_style='yahoo',
                                             marketcolors=mc,
                                             gridstyle=":")
        
        # Add indicators to DataFrame if present
        if 'indicators' in data and data['indicators']:
            print(f"Adding {len(data['indicators'])} indicators to DataFrame", file=sys.stderr)
            df = add_indicators(df, data['indicators'])
            print(f"DataFrame columns after adding indicators: {list(df.columns)}", file=sys.stderr)
        
        # Group indicators by type for panel creation
        overlay_indicators = []  # Main price chart
        macd_indicators = []     # MACD panel
        rsi_indicators = []      # RSI panel
        atr_indicators = []      # ATR panel
        stoch_indicators = []    # Stochastic panel
        williams_r_indicators = [] # Williams %R panel
        cci_indicators = []      # CCI panel
        mfi_indicators = []      # MFI panel
        obv_indicators = []      # OBV panel
        adx_indicators = []      # ADX panel
        
        # Print indicator types we're looking for
        print("Categorizing indicators by type...", file=sys.stderr)
        for indicator in data.get('indicators', []):
            ind_type = indicator.get('type', '').lower()
            print(f"Processing indicator of type: {ind_type}", file=sys.stderr)
            
            # Overlay indicators (on price chart)
            if ind_type in ['ma', 'sma', 'ema', 'wma', 'bb', 'bollingerbands', 'vwap', 'psar', 'parabolicsar']:
                overlay_indicators.append(indicator)
                print(f"Added as overlay indicator: {ind_type}", file=sys.stderr)
            # MACD (separate pane)
            elif ind_type in ['macd', 'macdline', 'macdsignal', 'macdhistogram']:
                macd_indicators.append(indicator)
                print(f"Added as MACD indicator: {ind_type}", file=sys.stderr)
            # RSI (separate pane)
            elif ind_type in ['rsi']:
                rsi_indicators.append(indicator)
                print(f"Added as RSI indicator: {ind_type}", file=sys.stderr)
            # ATR (separate pane)
            elif ind_type in ['atr']:
                atr_indicators.append(indicator)
                print(f"Added as ATR indicator: {ind_type}", file=sys.stderr)
            # Stochastic (separate pane)
            elif ind_type in ['stochastic', 'stoch', 'stochasticoscillator']:
                stoch_indicators.append(indicator)
                print(f"Added as Stochastic indicator: {ind_type}", file=sys.stderr)
            # Williams %R (separate pane)
            elif ind_type in ['williamsr', 'williams%r', 'percentr']:
                williams_r_indicators.append(indicator)
                print(f"Added as Williams %R indicator: {ind_type}", file=sys.stderr)
            # CCI (separate pane)
            elif ind_type in ['cci']:
                cci_indicators.append(indicator)
                print(f"Added as CCI indicator: {ind_type}", file=sys.stderr)
            # MFI (separate pane)
            elif ind_type in ['mfi']:
                mfi_indicators.append(indicator)
                print(f"Added as MFI indicator: {ind_type}", file=sys.stderr)
            # OBV (separate pane)
            elif ind_type in ['obv']:
                obv_indicators.append(indicator)
                print(f"Added as OBV indicator: {ind_type}", file=sys.stderr)
            # ADX (separate pane)
            elif ind_type in ['adx']:
                adx_indicators.append(indicator)
                print(f"Added as ADX indicator: {ind_type}", file=sys.stderr)
            else:
                print(f"Unknown indicator type: {ind_type}", file=sys.stderr)
        
        # Prepare plots using addplot
        addplots = []
        
        # 1. Add overlay indicators to main price panel
        print(f"Preparing overlay indicators for main chart", file=sys.stderr)
        for indicator in overlay_indicators:
            ind_type = indicator.get('type', '').lower()
            params = indicator.get('params', {})
            
            try:
                if ind_type in ['sma', 'ma']:
                    period = params.get('period', 20)
                    col_name = f'sma_{period}'
                    if col_name in df.columns and df[col_name].notna().any():
                        print(f"Adding SMA({period}) to main chart", file=sys.stderr)
                        addplots.append(mpf.make_addplot(df[col_name], width=1.5, color='blue', 
                                                        panel=0, secondary_y=False, 
                                                        ylabel='Price'))
                
                elif ind_type == 'ema':
                    period = params.get('period', 12)
                    col_name = f'ema_{period}'
                    if col_name in df.columns and df[col_name].notna().any():
                        print(f"Adding EMA({period}) to main chart", file=sys.stderr)
                        addplots.append(mpf.make_addplot(df[col_name], width=1.5, color='orange', 
                                                        panel=0, secondary_y=False))
                
                elif ind_type == 'wma':
                    period = params.get('period', 20)
                    col_name = f'wma_{period}'
                    if col_name in df.columns and df[col_name].notna().any():
                        print(f"Adding WMA({period}) to main chart", file=sys.stderr)
                        addplots.append(mpf.make_addplot(df[col_name], width=1.5, color='teal', 
                                                        panel=0, secondary_y=False))
                
                elif ind_type == 'vwap':
                    if 'vwap' in df.columns and df['vwap'].notna().any():
                        print(f"Adding VWAP to main chart", file=sys.stderr)
                        addplots.append(mpf.make_addplot(df['vwap'], width=1.5, color='magenta', 
                                                        panel=0, secondary_y=False))
                
                elif ind_type in ['psar', 'parabolicsar']:
                    if 'psar' in df.columns and df['psar'].notna().any():
                        print(f"Adding Parabolic SAR to main chart", file=sys.stderr)
                        addplots.append(mpf.make_addplot(df['psar'], width=0, type='scatter', 
                                                        markersize=3, marker='o', color='cyan', 
                                                        panel=0, secondary_y=False))
                
                elif ind_type in ['bb', 'bollingerbands']:
                    period = params.get('period', 20)
                    mid_col = f'bb_middle_{period}'
                    upper_col = f'bb_upper_{period}'
                    lower_col = f'bb_lower_{period}'
                    
                    if mid_col in df.columns and upper_col in df.columns and lower_col in df.columns:
                        print(f"Adding Bollinger Bands({period}) to main chart", file=sys.stderr)
                        addplots.append(mpf.make_addplot(df[mid_col], width=1, color='green', 
                                                        panel=0, secondary_y=False))
                        addplots.append(mpf.make_addplot(df[upper_col], width=0.8, color='green', 
                                                        panel=0, secondary_y=False, linestyle='--'))
                        addplots.append(mpf.make_addplot(df[lower_col], width=0.8, color='green', 
                                                        panel=0, secondary_y=False, linestyle='--'))
            except Exception as e:
                print(f"Error adding overlay indicator {ind_type}: {str(e)}", file=sys.stderr)
        
        # 2. Set up panels for oscillator indicators
        panel_count = 1  # Start from panel 1 (main chart is panel 0)
        panel_map = {}
        
        # MACD Panel
        if macd_indicators and 'macd_line' in df.columns and 'macd_signal' in df.columns and 'macd_histogram' in df.columns:
            print(f"Adding MACD panel at position {panel_count}", file=sys.stderr)
            panel_map['macd'] = panel_count
            
            # Add MACD line and signal line
            addplots.append(mpf.make_addplot(df['macd_line'], width=1.5, color='blue', 
                                           panel=panel_count, ylabel='MACD'))
            addplots.append(mpf.make_addplot(df['macd_signal'], width=1, color='orange', 
                                           panel=panel_count))
            
            # Add MACD histogram as bars
            # Use different colors for positive and negative values
            pos_hist = df['macd_histogram'].copy()
            neg_hist = df['macd_histogram'].copy()
            pos_hist[pos_hist <= 0] = np.nan
            neg_hist[neg_hist > 0] = np.nan
            
            # Add the histogram bars with appropriate colors
            addplots.append(mpf.make_addplot(pos_hist, type='bar', width=0.7, color='green', alpha=0.5, 
                                           panel=panel_count))
            addplots.append(mpf.make_addplot(neg_hist, type='bar', width=0.7, color='red', alpha=0.5, 
                                           panel=panel_count))
            
            print(f"Added MACD histogram with positive and negative bars", file=sys.stderr)
            panel_count += 1
        
        # RSI Panel
        if rsi_indicators and 'rsi' in df.columns:
            print(f"Adding RSI panel at position {panel_count}", file=sys.stderr)
            panel_map['rsi'] = panel_count
            addplots.append(mpf.make_addplot(df['rsi'], width=1.5, color='purple', 
                                           panel=panel_count, ylabel='RSI'))
            # Add overbought/oversold lines
            addplots.append(mpf.make_addplot([70] * len(df), width=0.8, color='red', 
                                           panel=panel_count, linestyle='--'))
            addplots.append(mpf.make_addplot([30] * len(df), width=0.8, color='green', 
                                           panel=panel_count, linestyle='--'))
            panel_count += 1
        
        # ATR Panel
        if atr_indicators and 'atr' in df.columns:
            print(f"Adding ATR panel at position {panel_count}", file=sys.stderr)
            panel_map['atr'] = panel_count
            addplots.append(mpf.make_addplot(df['atr'], width=1.5, color='brown', 
                                           panel=panel_count, ylabel='ATR'))
            panel_count += 1
        
        # Stochastic Panel
        if stoch_indicators and 'stoch_k' in df.columns and 'stoch_d' in df.columns:
            print(f"Adding Stochastic panel at position {panel_count}", file=sys.stderr)
            panel_map['stoch'] = panel_count
            addplots.append(mpf.make_addplot(df['stoch_k'], width=1.5, color='blue', 
                                           panel=panel_count, ylabel='Stoch'))
            addplots.append(mpf.make_addplot(df['stoch_d'], width=1, color='red', 
                                           panel=panel_count))
            # Add overbought/oversold lines
            addplots.append(mpf.make_addplot([80] * len(df), width=0.8, color='red', 
                                           panel=panel_count, linestyle='--'))
            addplots.append(mpf.make_addplot([20] * len(df), width=0.8, color='green', 
                                           panel=panel_count, linestyle='--'))
            panel_count += 1
            
        # Williams %R Panel
        if williams_r_indicators and 'williams_r' in df.columns:
            print(f"Adding Williams %R panel at position {panel_count}", file=sys.stderr)
            panel_map['williams_r'] = panel_count
            addplots.append(mpf.make_addplot(df['williams_r'], width=1.5, color='purple', 
                                           panel=panel_count, ylabel='%R'))
            # Add overbought/oversold lines
            addplots.append(mpf.make_addplot([-20] * len(df), width=0.8, color='red', 
                                           panel=panel_count, linestyle='--'))
            addplots.append(mpf.make_addplot([-80] * len(df), width=0.8, color='green', 
                                           panel=panel_count, linestyle='--'))
            panel_count += 1
            
        # CCI Panel
        if cci_indicators and 'cci' in df.columns:
            print(f"Adding CCI panel at position {panel_count}", file=sys.stderr)
            panel_map['cci'] = panel_count
            addplots.append(mpf.make_addplot(df['cci'], width=1.5, color='blue', 
                                           panel=panel_count, ylabel='CCI'))
            # Add overbought/oversold lines
            addplots.append(mpf.make_addplot([100] * len(df), width=0.8, color='red', 
                                           panel=panel_count, linestyle='--'))
            addplots.append(mpf.make_addplot([-100] * len(df), width=0.8, color='green', 
                                           panel=panel_count, linestyle='--'))
            panel_count += 1
            
        # MFI Panel
        if mfi_indicators and 'mfi' in df.columns:
            print(f"Adding MFI panel at position {panel_count}", file=sys.stderr)
            panel_map['mfi'] = panel_count
            addplots.append(mpf.make_addplot(df['mfi'], width=1.5, color='orange', 
                                           panel=panel_count, ylabel='MFI'))
            # Add overbought/oversold lines
            addplots.append(mpf.make_addplot([80] * len(df), width=0.8, color='red', 
                                           panel=panel_count, linestyle='--'))
            addplots.append(mpf.make_addplot([20] * len(df), width=0.8, color='green', 
                                           panel=panel_count, linestyle='--'))
            panel_count += 1
            
        # OBV Panel
        if obv_indicators and 'obv' in df.columns:
            print(f"Adding OBV panel at position {panel_count}", file=sys.stderr)
            panel_map['obv'] = panel_count
            addplots.append(mpf.make_addplot(df['obv'], width=1.5, color='teal', 
                                           panel=panel_count, ylabel='OBV'))
            panel_count += 1
            
        # ADX Panel
        if adx_indicators and 'adx' in df.columns and 'plus_di' in df.columns and 'minus_di' in df.columns:
            print(f"Adding ADX panel at position {panel_count}", file=sys.stderr)
            panel_map['adx'] = panel_count
            addplots.append(mpf.make_addplot(df['adx'], width=1.5, color='black', 
                                           panel=panel_count, ylabel='ADX'))
            addplots.append(mpf.make_addplot(df['plus_di'], width=1, color='green', 
                                           panel=panel_count))
            addplots.append(mpf.make_addplot(df['minus_di'], width=1, color='red', 
                                           panel=panel_count))
            # Add trend strength line
            addplots.append(mpf.make_addplot([25] * len(df), width=0.8, color='gray', 
                                           panel=panel_count, linestyle='--'))
            panel_count += 1
        
        # Calculate panel ratios - main chart gets more space
        panel_ratios = [3] + [1] * (panel_count - 1) if panel_count > 1 else None
        
        # Create the figure and plot
        print(f"Creating multi-pane chart with {panel_count} panels", file=sys.stderr)
        try:
            # Calculate figure height based on number of panels
            # Using extra-wide dimensions to show many candles clearly for LLM analysis
            # Width is significantly increased to make individual candles more visible
            figsize = (24, 8 + (panel_count - 1) * 2.5)
            
            # Plot the multi-panel chart with indicators
            # Ensure panel_ratios is a valid tuple or list
            valid_panel_ratios = panel_ratios if isinstance(panel_ratios, (tuple, list)) else (1,) * panel_count
            
            # Make sure we have the right number of panel ratios
            if len(valid_panel_ratios) != panel_count:
                valid_panel_ratios = (1,) * panel_count
                
            print(f"Using panel_ratios: {valid_panel_ratios}", file=sys.stderr)
            
            fig, axes = mpf.plot(df, type='candle', style=custom_style, 
                               volume=False,  # We handle volume in our own panel if needed
                               figsize=figsize,
                               panel_ratios=valid_panel_ratios,
                               addplot=addplots,
                               returnfig=True)
            
            # Add title if provided
            title = data.get('title', '')
            if title:
                fig.suptitle(title, fontsize=12, color='white' if dark_mode else 'black')
            
            # Save plot to memory buffer instead of file
            buf = io.BytesIO()
            # Higher DPI for significantly better image quality and resolution
            fig.savefig(buf, format='png', dpi=200, bbox_inches='tight')
            buf.seek(0)
            
            # Output the binary data to stdout
            print("Sending chart image to stdout", file=sys.stderr)
            sys.stdout.buffer.write(buf.getvalue())
            plt.close(fig)
            print("Chart generation complete", file=sys.stderr)
            
        except Exception as e:
            print(f"ERROR in chart generation: {str(e)}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            sys.exit(1)
            
    except Exception as e:
        print(f"ERROR in Python chart generator: {str(e)}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
