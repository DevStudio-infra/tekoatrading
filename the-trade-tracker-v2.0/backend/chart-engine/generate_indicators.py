"""
Generate indicators chart from JSON data
Uses mplfinance to create charts with technical indicators
Supports the multi-pane chart architecture with:
- Main price chart: candlesticks with overlay indicators (MA, BB)
- Separate oscillator panes: MACD, RSI, ATR, Stochastic
"""
import sys
import json
import mplfinance as mpf
import pandas as pd
import io
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec
from matplotlib.lines import Line2D
import matplotlib.colors as mcolors
import traceback
from utils import add_indicators, calculate_sma, calculate_ema, calculate_bollinger_bands
from utils import calculate_macd, calculate_rsi, calculate_atr, calculate_stochastic

def main():
    try:
        print("Python indicators chart generator starting...", file=sys.stderr)
        
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
                # Convert UNIX timestamp to datetime
                df['datetime'] = pd.to_datetime(df['time'], unit='s')
            else:
                print("Converting string dates to datetime", file=sys.stderr)
                # Convert string date to datetime
                df['datetime'] = pd.to_datetime(df['time'])
            
            # Set datetime as index and ensure OHLCV columns are present
            df.set_index('datetime', inplace=True)
            print(f"Set datetime index. New index: {df.index.name}", file=sys.stderr)
        else:
            # Fallback to integer index if no time column is found
            print("WARNING: No time column found, using row numbers as index", file=sys.stderr)
            print(f"Available columns: {list(df.columns)}", file=sys.stderr)
        
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
        
        # Add indicators to DataFrame
        print(f"Adding indicators to DataFrame", file=sys.stderr)
        df = add_indicators(df, data.get('indicators', []))
        print(f"DataFrame columns after adding indicators: {list(df.columns)}", file=sys.stderr)
        
        # Group indicators by type according to our multi-pane architecture
        overlay_indicators = []
        macd_indicators = []
        rsi_indicators = []
        atr_indicators = []
        stoch_indicators = []
        
        # Print indicator types we're looking for
        print("Categorizing indicators by type...", file=sys.stderr)
        for indicator in data.get('indicators', []):
            ind_type = indicator.get('type', '').lower()
            print(f"Processing indicator of type: {ind_type}", file=sys.stderr)
            
            # Overlay indicators (on price chart)
            if ind_type in ['ma', 'sma', 'ema', 'bb', 'bollingerbands']:
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
            elif ind_type in ['stochastic', 'stoch', 'stoch_k', 'stoch_d']:
                stoch_indicators.append(indicator)
                print(f"Added as Stochastic indicator: {ind_type}", file=sys.stderr)
            else:
                print(f"Unknown indicator type: {ind_type}", file=sys.stderr)
        
        # Determine how many panes we need
        panes = []
        if macd_indicators: panes.append('macd')
        if rsi_indicators: panes.append('rsi')
        if atr_indicators: panes.append('atr')
        if stoch_indicators: panes.append('stoch')
        
        print(f"Creating {len(panes) + 1} panes: Main + {', '.join(panes)}", file=sys.stderr)
        
        # Create figure with appropriate grid based on which indicator panes are needed
        num_panes = 1 + len(panes)  # Main price chart + indicator panes
        
        # Setup height ratios (price chart gets 3x height of indicator panes)
        height_ratios = [3] + [1] * len(panes)
        
        # Create figure
        fig = plt.figure(figsize=(10, 8))
        gs = GridSpec(num_panes, 1, figure=fig, height_ratios=height_ratios)
        
        # Main price chart
        ax_main = fig.add_subplot(gs[0])
        print("Created main price chart pane", file=sys.stderr)
        
        # Apply styles to main chart
        mpf.plot(df, type='candle', style=style, ax=ax_main, volume=False, xrotation=0)
        
        # Generate a color cycle for indicators
        colors = list(mcolors.TABLEAU_COLORS.values())
        
        # Plot overlay indicators on main chart
        print(f"Plotting {len(overlay_indicators)} overlay indicators on main chart", file=sys.stderr)
        for i, indicator in enumerate(overlay_indicators):
            color = colors[i % len(colors)]
            ind_type = indicator.get('type', '').lower()
            params = indicator.get('params', {})
            period = params.get('period', 20)
            
            try:
                if ind_type in ['sma', 'ma']:
                    print(f"Plotting SMA({period}) on main chart", file=sys.stderr)
                    col_name = f'sma_{period}'
                    if col_name in df.columns:
                        ax_main.plot(df.index, df[col_name], color=color, linewidth=1.5, 
                                    label=f'SMA({period})')
                    else:
                        print(f"WARNING: Column {col_name} not found in DataFrame", file=sys.stderr)
                
                elif ind_type == 'ema':
                    print(f"Plotting EMA({period}) on main chart", file=sys.stderr)
                    col_name = f'ema_{period}'
                    if col_name in df.columns:
                        ax_main.plot(df.index, df[col_name], color=color, linewidth=1.5, 
                                    label=f'EMA({period})')
                    else:
                        print(f"WARNING: Column {col_name} not found in DataFrame", file=sys.stderr)
                
                elif ind_type in ['bb', 'bollingerbands']:
                    print(f"Plotting Bollinger Bands({period}) on main chart", file=sys.stderr)
                    std_dev = params.get('stdDev', 2.0)
                    middle_color = color
                    band_color = colors[(i + 1) % len(colors)]
                    
                    mid_col = f'bb_middle_{period}'
                    upper_col = f'bb_upper_{period}'
                    lower_col = f'bb_lower_{period}'
                    
                    if mid_col in df.columns and upper_col in df.columns and lower_col in df.columns:
                        ax_main.plot(df.index, df[mid_col], color=middle_color, linewidth=1.5, 
                                    label=f'BB({period}) Middle')
                        ax_main.plot(df.index, df[upper_col], color=band_color, linewidth=1, 
                                    linestyle='--', label=f'BB({period}) Upper')
                        ax_main.plot(df.index, df[lower_col], color=band_color, linewidth=1, 
                                    linestyle='--', label=f'BB({period}) Lower')
                    else:
                        missing = [c for c in [mid_col, upper_col, lower_col] if c not in df.columns]
                        print(f"WARNING: Some Bollinger Band columns not found: {missing}", file=sys.stderr)
            except Exception as e:
                print(f"Error plotting overlay indicator {ind_type}: {str(e)}", file=sys.stderr)
        
        # Add legend to main chart
        if overlay_indicators:
            ax_main.legend(loc='upper left')
            print("Added legend to main chart", file=sys.stderr)
        
        # Create indicator panes
        indicator_axes = {}
        
        for i, pane_type in enumerate(panes):
            print(f"Creating pane for {pane_type}", file=sys.stderr)
            ax = fig.add_subplot(gs[i+1], sharex=ax_main)
            indicator_axes[pane_type] = ax
            
            try:
                # MACD Pane
                if pane_type == 'macd':
                    print("Plotting MACD indicators", file=sys.stderr)
                    if 'macd_line' in df.columns and 'macd_signal' in df.columns and 'macd_histogram' in df.columns:
                        # Plot MACD line
                        ax.plot(df.index, df['macd_line'], color='blue', linewidth=1.5, label='MACD')
                        # Plot Signal line
                        ax.plot(df.index, df['macd_signal'], color='red', linewidth=1, label='Signal')
                        # Plot Histogram
                        for j in range(len(df.index) - 1):
                            if df['macd_histogram'].iloc[j] >= 0:
                                color = 'green'
                            else:
                                color = 'red'
                            ax.bar(df.index[j], df['macd_histogram'].iloc[j], width=0.7, color=color, alpha=0.5)
                        
                        ax.axhline(y=0, color='gray', linestyle='-', alpha=0.3)
                        ax.set_ylabel('MACD', fontsize=8)
                        ax.legend(loc='upper left', fontsize=8)
                        print("MACD indicators plotted successfully", file=sys.stderr)
                    else:
                        missing = [c for c in ['macd_line', 'macd_signal', 'macd_histogram'] if c not in df.columns]
                        print(f"WARNING: Some MACD columns not found: {missing}", file=sys.stderr)
                
                # RSI Pane
                elif pane_type == 'rsi':
                    print("Plotting RSI indicator", file=sys.stderr)
                    if 'rsi' in df.columns:
                        ax.plot(df.index, df['rsi'], color='purple', linewidth=1.5)
                        ax.axhline(y=70, color='red', linestyle='--', alpha=0.5)
                        ax.axhline(y=30, color='green', linestyle='--', alpha=0.5)
                        ax.axhline(y=50, color='gray', linestyle='-', alpha=0.3)
                        ax.set_ylabel('RSI', fontsize=8)
                        ax.set_ylim(0, 100)
                        print("RSI indicator plotted successfully", file=sys.stderr)
                    else:
                        print("WARNING: RSI column not found in DataFrame", file=sys.stderr)
                
                # ATR Pane
                elif pane_type == 'atr':
                    print("Plotting ATR indicator", file=sys.stderr)
                    if 'atr' in df.columns:
                        ax.plot(df.index, df['atr'], color='brown', linewidth=1.5)
                        ax.set_ylabel('ATR', fontsize=8)
                        print("ATR indicator plotted successfully", file=sys.stderr)
                    else:
                        print("WARNING: ATR column not found in DataFrame", file=sys.stderr)
                
                # Stochastic Pane
                elif pane_type == 'stoch':
                    print("Plotting Stochastic indicators", file=sys.stderr)
                    if 'stoch_k' in df.columns and 'stoch_d' in df.columns:
                        ax.plot(df.index, df['stoch_k'], color='blue', linewidth=1.5, label='%K')
                        ax.plot(df.index, df['stoch_d'], color='red', linewidth=1, label='%D')
                        ax.axhline(y=80, color='red', linestyle='--', alpha=0.5)
                        ax.axhline(y=20, color='green', linestyle='--', alpha=0.5)
                        ax.set_ylabel('Stoch', fontsize=8)
                        ax.set_ylim(0, 100)
                        ax.legend(loc='upper left', fontsize=8)
                        print("Stochastic indicators plotted successfully", file=sys.stderr)
                    else:
                        missing = [c for c in ['stoch_k', 'stoch_d'] if c not in df.columns]
                        print(f"WARNING: Some Stochastic columns not found: {missing}", file=sys.stderr)
                
                # Format Y-axis to be more compact
                ax.tick_params(axis='y', labelsize=8)
            except Exception as e:
                print(f"Error plotting {pane_type} indicators: {str(e)}", file=sys.stderr)
        
        # Remove x-axis labels for all but the bottom-most pane
        for ax in list(indicator_axes.values())[:-1]:
            plt.setp(ax.get_xticklabels(), visible=False)
        
        # Format x-axis on the main chart
        plt.setp(ax_main.get_xticklabels(), visible=False)
        
        # Add padding between subplots
        plt.tight_layout()
        plt.subplots_adjust(hspace=0.1)
        
        # Save plot to memory buffer instead of file
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        
        # Output the binary data to stdout
        print("Sending chart image to stdout", file=sys.stderr)
        sys.stdout.buffer.write(buf.getvalue())
        plt.close(fig)
        print("Chart generation complete", file=sys.stderr)
        
    except Exception as e:
        print(f"ERROR in Python indicators chart generator: {str(e)}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
