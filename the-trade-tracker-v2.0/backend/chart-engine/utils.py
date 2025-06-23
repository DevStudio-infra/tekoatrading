"""
Technical indicators calculation functions for chart generation.
Supports the multi-pane chart architecture:
- Main price chart: candlesticks with overlay indicators (MA, BB)
- Separate oscillator panes: MACD, RSI, ATR, Stochastic
"""
import numpy as np
import pandas as pd
import sys
from typing import Dict, List, Any, Optional

def calculate_sma(prices: np.ndarray, period: int) -> np.ndarray:
    """Calculate Simple Moving Average"""
    return pd.Series(prices).rolling(window=period).mean().values

def calculate_ema(prices: np.ndarray, period: int) -> np.ndarray:
    """Calculate Exponential Moving Average"""
    return pd.Series(prices).ewm(span=period, adjust=False).mean().values

def calculate_bollinger_bands(prices: np.ndarray, period: int = 20, std_dev: float = 2.0) -> Dict[str, np.ndarray]:
    """Calculate Bollinger Bands"""
    sma = calculate_sma(prices, period)
    rolling_std = pd.Series(prices).rolling(window=period).std().values
    upper_band = sma + (rolling_std * std_dev)
    lower_band = sma - (rolling_std * std_dev)
    return {'middle': sma, 'upper': upper_band, 'lower': lower_band}

def calculate_macd(prices: np.ndarray, fast_period: int = 12, slow_period: int = 26, signal_period: int = 9) -> Dict[str, np.ndarray]:
    """Calculate MACD (Moving Average Convergence Divergence)"""
    fast_ema = calculate_ema(prices, fast_period)
    slow_ema = calculate_ema(prices, slow_period)
    macd_line = fast_ema - slow_ema
    macd_signal = calculate_ema(macd_line, signal_period)
    macd_histogram = macd_line - macd_signal
    return {'macd': macd_line, 'signal': macd_signal, 'histogram': macd_histogram}

def calculate_rsi(prices: np.ndarray, period: int = 14) -> np.ndarray:
    """Calculate Relative Strength Index"""
    # Calculate price changes
    deltas = np.diff(prices)
    deltas = np.append(deltas, 0)  # Add 0 to maintain array size
    
    # Calculate gains and losses
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    
    # Calculate average gains and losses
    avg_gains = np.zeros_like(prices)
    avg_losses = np.zeros_like(prices)
    
    # First period average
    avg_gains[period] = np.mean(gains[:period])
    avg_losses[period] = np.mean(losses[:period])
    
    # Rolling average
    for i in range(period + 1, len(prices)):
        avg_gains[i] = (avg_gains[i-1] * (period-1) + gains[i]) / period
        avg_losses[i] = (avg_losses[i-1] * (period-1) + losses[i]) / period
    
    # Calculate RS and RSI
    rs = np.zeros_like(prices)
    rsi = np.zeros_like(prices)
    
    for i in range(period, len(prices)):
        if avg_losses[i] == 0:
            rsi[i] = 100
        else:
            rs[i] = avg_gains[i] / avg_losses[i]
            rsi[i] = 100 - (100 / (1 + rs[i]))
    
    return rsi

def calculate_atr(high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int = 14) -> np.ndarray:
    """Calculate Average True Range"""
    high_low = high - low
    high_close_prev = np.abs(high[1:] - close[:-1])
    high_close_prev = np.insert(high_close_prev, 0, 0)
    low_close_prev = np.abs(low[1:] - close[:-1])
    low_close_prev = np.insert(low_close_prev, 0, 0)
    
    tr = np.maximum(high_low, np.maximum(high_close_prev, low_close_prev))
    atr = np.zeros_like(close)
    atr[period-1] = np.mean(tr[:period])
    
    for i in range(period, len(close)):
        atr[i] = (atr[i-1] * (period-1) + tr[i]) / period
    
    return atr

def calculate_stochastic(high: np.ndarray, low: np.ndarray, close: np.ndarray, k_period: int = 14, d_period: int = 3, slowing: int = 1) -> Dict[str, np.ndarray]:
    """Calculate Stochastic Oscillator"""
    # %K = (Current Close - Lowest Low)/(Highest High - Lowest Low) * 100
    k_raw = np.zeros_like(close)
    
    for i in range(k_period-1, len(close)):
        highest_high = np.max(high[i-(k_period-1):i+1])
        lowest_low = np.min(low[i-(k_period-1):i+1])
        if highest_high != lowest_low:
            k_raw[i] = (close[i] - lowest_low) / (highest_high - lowest_low) * 100
        else:
            k_raw[i] = 50  # Default to middle if range is zero
    
    # Apply slowing period (moving average of raw %K)
    k = np.zeros_like(close)
    if slowing > 1:
        for i in range(k_period + slowing - 2, len(close)):
            k[i] = np.mean(k_raw[i-(slowing-1):i+1])
    else:
        k = k_raw
    
    # %D = 3-day SMA of %K
    d = calculate_sma(k, d_period)
    
    return {'k': k, 'd': d}

def calculate_wma(prices: np.ndarray, period: int) -> np.ndarray:
    """Calculate Weighted Moving Average"""
    wma = np.zeros_like(prices)
    weights = np.arange(1, period + 1)
    sum_weights = np.sum(weights)
    
    for i in range(period - 1, len(prices)):
        wma[i] = np.sum(prices[i-(period-1):i+1] * weights) / sum_weights
    
    return wma

def calculate_vwap(prices: np.ndarray, volumes: np.ndarray, period: int = None) -> np.ndarray:
    """Calculate Volume Weighted Average Price
    If period is None, calculates VWAP from the beginning of the series.
    Otherwise, calculates a rolling VWAP over the specified period.
    """
    vwap = np.zeros_like(prices)
    price_volume = prices * volumes
    
    if period is None:
        # Cumulative VWAP
        cumulative_pv = np.cumsum(price_volume)
        cumulative_volume = np.cumsum(volumes)
        # Avoid division by zero
        volume_nonzero = np.where(cumulative_volume > 0, cumulative_volume, 1)
        vwap = cumulative_pv / volume_nonzero
    else:
        # Rolling VWAP
        for i in range(period - 1, len(prices)):
            if np.sum(volumes[i-(period-1):i+1]) > 0:
                vwap[i] = np.sum(price_volume[i-(period-1):i+1]) / np.sum(volumes[i-(period-1):i+1])
            else:
                vwap[i] = prices[i]  # Default to price if no volume
    
    return vwap

def calculate_parabolic_sar(high: np.ndarray, low: np.ndarray, close: np.ndarray, 
                           af_start: float = 0.02, af_increment: float = 0.02, 
                           af_max: float = 0.2) -> np.ndarray:
    """Calculate Parabolic SAR (Stop and Reverse)"""
    sar = np.zeros_like(close)
    
    # Need at least 2 bars
    if len(close) < 2:
        return sar
    
    # Initialize
    trend = 1  # 1 for uptrend, -1 for downtrend
    extreme_point = high[0]
    sar[0] = low[0]
    af = af_start
    
    for i in range(1, len(close)):
        # Previous SAR
        sar[i] = sar[i-1] + af * (extreme_point - sar[i-1])
        
        # Make sure SAR doesn't go beyond the previous two candles' lows in an uptrend
        # or the previous two candles' highs in a downtrend
        if trend == 1:
            if i >= 2:
                sar[i] = min(sar[i], min(low[i-1], low[i-2]))
            else:
                sar[i] = min(sar[i], low[i-1])
                
            # Trend switch check
            if low[i] < sar[i]:
                trend = -1
                sar[i] = extreme_point
                extreme_point = low[i]
                af = af_start
            else:
                # Update extreme point and acceleration factor in current trend
                if high[i] > extreme_point:
                    extreme_point = high[i]
                    af = min(af + af_increment, af_max)
        else:  # trend == -1
            if i >= 2:
                sar[i] = max(sar[i], max(high[i-1], high[i-2]))
            else:
                sar[i] = max(sar[i], high[i-1])
                
            # Trend switch check
            if high[i] > sar[i]:
                trend = 1
                sar[i] = extreme_point
                extreme_point = high[i]
                af = af_start
            else:
                # Update extreme point and acceleration factor in current trend
                if low[i] < extreme_point:
                    extreme_point = low[i]
                    af = min(af + af_increment, af_max)
    
    return sar

def calculate_williams_r(high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int = 14) -> np.ndarray:
    """Calculate Williams %R
    Williams %R = (Highest High - Close)/(Highest High - Lowest Low) * -100
    """
    williams_r = np.zeros_like(close)
    
    for i in range(period - 1, len(close)):
        highest_high = np.max(high[i-(period-1):i+1])
        lowest_low = np.min(low[i-(period-1):i+1])
        if highest_high != lowest_low:
            williams_r[i] = ((highest_high - close[i]) / (highest_high - lowest_low)) * -100
        else:
            williams_r[i] = -50  # Default to middle if range is zero
    
    return williams_r

def calculate_cci(high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int = 20) -> np.ndarray:
    """Calculate Commodity Channel Index
    CCI = (Typical Price - SMA of Typical Price) / (0.015 * Mean Deviation)
    Typical Price = (High + Low + Close) / 3
    """
    typical_price = (high + low + close) / 3
    tp_sma = np.zeros_like(close)
    cci = np.zeros_like(close)
    
    # Calculate SMA of typical price
    for i in range(period - 1, len(close)):
        tp_sma[i] = np.mean(typical_price[i-(period-1):i+1])
    
    # Calculate mean deviation
    for i in range(period - 1, len(close)):
        mean_dev = np.mean(np.abs(typical_price[i-(period-1):i+1] - tp_sma[i]))
        if mean_dev == 0:
            cci[i] = 0  # Avoid division by zero
        else:
            cci[i] = (typical_price[i] - tp_sma[i]) / (0.015 * mean_dev)
    
    return cci

def calculate_mfi(high: np.ndarray, low: np.ndarray, close: np.ndarray, volume: np.ndarray, period: int = 14) -> np.ndarray:
    """Calculate Money Flow Index (MFI)
    MFI = 100 - (100 / (1 + Money Flow Ratio))
    Money Flow Ratio = Positive Money Flow / Negative Money Flow
    """
    typical_price = (high + low + close) / 3
    money_flow = typical_price * volume
    
    # Find price changes
    price_shift = np.zeros_like(typical_price)
    price_shift[1:] = typical_price[:-1]
    
    positive_flow = np.zeros_like(money_flow)
    negative_flow = np.zeros_like(money_flow)
    
    # Calculate positive and negative money flow
    for i in range(1, len(close)):
        if typical_price[i] > price_shift[i]:
            positive_flow[i] = money_flow[i]
        elif typical_price[i] < price_shift[i]:
            negative_flow[i] = money_flow[i]
    
    # Calculate MFI
    mfi = np.zeros_like(close)
    
    for i in range(period, len(close)):
        positive_sum = np.sum(positive_flow[i-(period-1):i+1])
        negative_sum = np.sum(negative_flow[i-(period-1):i+1])
        
        if negative_sum == 0:
            mfi[i] = 100  # All money flow is positive
        else:
            money_ratio = positive_sum / negative_sum
            mfi[i] = 100 - (100 / (1 + money_ratio))
    
    return mfi

def calculate_obv(close: np.ndarray, volume: np.ndarray) -> np.ndarray:
    """Calculate On-Balance Volume (OBV)
    If close > close_prev, OBV = OBV_prev + Volume
    If close < close_prev, OBV = OBV_prev - Volume
    If close = close_prev, OBV = OBV_prev
    """
    obv = np.zeros_like(close)
    
    for i in range(1, len(close)):
        if close[i] > close[i-1]:
            obv[i] = obv[i-1] + volume[i]
        elif close[i] < close[i-1]:
            obv[i] = obv[i-1] - volume[i]
        else:
            obv[i] = obv[i-1]
    
    return obv

def calculate_adx(high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int = 14) -> Dict[str, np.ndarray]:
    """Calculate Average Directional Index (ADX)
    ADX = SMA of DX over period
    DX = 100 * abs(+DI - -DI) / (+DI + -DI)
    +DI = 100 * SMA(+DM / TR, period)
    -DI = 100 * SMA(-DM / TR, period)
    +DM = max(high - high_prev, 0) if (high - high_prev) > (low_prev - low)
    -DM = max(low_prev - low, 0) if (low_prev - low) > (high - high_prev)
    TR = max(high - low, abs(high - close_prev), abs(low - close_prev))
    """
    # Initialize arrays
    tr = np.zeros_like(close)
    plus_dm = np.zeros_like(close)
    minus_dm = np.zeros_like(close)
    
    # Calculate TR, +DM, -DM
    for i in range(1, len(close)):
        high_diff = high[i] - high[i-1]
        low_diff = low[i-1] - low[i]
        
        # +DM and -DM
        if high_diff > low_diff and high_diff > 0:
            plus_dm[i] = high_diff
        else:
            plus_dm[i] = 0
            
        if low_diff > high_diff and low_diff > 0:
            minus_dm[i] = low_diff
        else:
            minus_dm[i] = 0
        
        # TR
        tr[i] = max(
            high[i] - low[i],
            abs(high[i] - close[i-1]),
            abs(low[i] - close[i-1])
        )
    
    # Calculate smoothed TR, +DM, -DM (Wilder's smoothing)
    smoothed_tr = np.zeros_like(close)
    smoothed_plus_dm = np.zeros_like(close)
    smoothed_minus_dm = np.zeros_like(close)
    
    # First period average
    smoothed_tr[period] = np.sum(tr[1:period+1])
    smoothed_plus_dm[period] = np.sum(plus_dm[1:period+1])
    smoothed_minus_dm[period] = np.sum(minus_dm[1:period+1])
    
    # Rest of the periods
    for i in range(period+1, len(close)):
        smoothed_tr[i] = smoothed_tr[i-1] - (smoothed_tr[i-1] / period) + tr[i]
        smoothed_plus_dm[i] = smoothed_plus_dm[i-1] - (smoothed_plus_dm[i-1] / period) + plus_dm[i]
        smoothed_minus_dm[i] = smoothed_minus_dm[i-1] - (smoothed_minus_dm[i-1] / period) + minus_dm[i]
    
    # Calculate +DI and -DI
    plus_di = np.zeros_like(close)
    minus_di = np.zeros_like(close)
    
    for i in range(period, len(close)):
        if smoothed_tr[i] == 0:
            plus_di[i] = 0
            minus_di[i] = 0
        else:
            plus_di[i] = 100 * smoothed_plus_dm[i] / smoothed_tr[i]
            minus_di[i] = 100 * smoothed_minus_dm[i] / smoothed_tr[i]
    
    # Calculate DX
    dx = np.zeros_like(close)
    
    for i in range(period, len(close)):
        if (plus_di[i] + minus_di[i]) == 0:
            dx[i] = 0
        else:
            dx[i] = 100 * abs(plus_di[i] - minus_di[i]) / (plus_di[i] + minus_di[i])
    
    # Calculate ADX (smoothed DX)
    adx = np.zeros_like(close)
    
    # First ADX value is average of DX for period
    if len(close) >= 2*period:
        adx[2*period-1] = np.mean(dx[period:2*period])
        
        # Rest of ADX values are smoothed
        for i in range(2*period, len(close)):
            adx[i] = ((period - 1) * adx[i-1] + dx[i]) / period
    
    return {'adx': adx, 'plus_di': plus_di, 'minus_di': minus_di}

def add_indicators(df: pd.DataFrame, indicators: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Add technical indicators to the dataframe
    
    Args:
        df: Pandas DataFrame with OHLCV data
        indicators: List of indicator configurations
        
    Returns:
        DataFrame with added indicator columns
    """
    # Create a copy to avoid modifying the original
    result_df = df.copy()
    
    # Process each indicator
    for indicator in indicators:
        indicator_type = indicator.get('type', '').lower()
        params = indicator.get('params', {})
        
        print(f"Processing indicator: {indicator_type} with params: {params}", file=sys.stderr)
        
        # Simple Moving Average
        if indicator_type in ['sma', 'ma']:
            period = params.get('period', 20)
            print(f"Calculating SMA with period={period}", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) >= period:
                result_df[f'sma_{period}'] = calculate_sma(result_df['close'].values, period)
            else:
                print(f"WARNING: Not enough data points for SMA({period}). Need at least {period}, have {len(result_df)}", file=sys.stderr)
            
        # Exponential Moving Average
        elif indicator_type in ['ema']:
            period = params.get('period', 20)
            print(f"Calculating EMA with period={period}", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) >= period:
                result_df[f'ema_{period}'] = calculate_ema(result_df['close'].values, period)
            else:
                print(f"WARNING: Not enough data points for EMA({period}). Need at least {period}, have {len(result_df)}", file=sys.stderr)
            
        # Bollinger Bands
        elif indicator_type in ['bb', 'bollingerbands']:
            period = params.get('period', 20)
            std_dev = params.get('stdDev', 2.0)
            print(f"Calculating Bollinger Bands with period={period}, stdDev={std_dev}", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) >= period:
                bb = calculate_bollinger_bands(result_df['close'].values, period, std_dev)
                result_df[f'bb_middle_{period}'] = bb['middle']
                result_df[f'bb_upper_{period}'] = bb['upper']
                result_df[f'bb_lower_{period}'] = bb['lower']
            else:
                print(f"WARNING: Not enough data points for BB({period}). Need at least {period}, have {len(result_df)}", file=sys.stderr)
            
        # MACD
        elif indicator_type in ['macd']:
            fast_period = params.get('fastPeriod', 12)
            slow_period = params.get('slowPeriod', 26)
            signal_period = params.get('signalPeriod', 9)
            print(f"Calculating MACD with fastPeriod={fast_period}, slowPeriod={slow_period}, signalPeriod={signal_period}", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) >= slow_period + signal_period:
                macd = calculate_macd(result_df['close'].values, fast_period, slow_period, signal_period)
                result_df['macd_line'] = macd['macd']
                result_df['macd_signal'] = macd['signal']
                result_df['macd_histogram'] = macd['histogram']
            else:
                print(f"WARNING: Not enough data points for MACD. Need at least {slow_period + signal_period}, have {len(result_df)}", file=sys.stderr)
            
        # RSI
        elif indicator_type in ['rsi']:
            period = params.get('period', 14)
            print(f"Calculating RSI with period={period}", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) >= period + 1:  # +1 for price changes
                result_df['rsi'] = calculate_rsi(result_df['close'].values, period)
            else:
                print(f"WARNING: Not enough data points for RSI({period}). Need at least {period+1}, have {len(result_df)}", file=sys.stderr)
            
        # ATR
        elif indicator_type in ['atr']:
            period = params.get('period', 14)
            print(f"Calculating ATR with period={period}", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) >= period + 1:  # +1 for price changes
                result_df['atr'] = calculate_atr(
                    result_df['high'].values, 
                    result_df['low'].values, 
                    result_df['close'].values, 
                    period
                )
            else:
                print(f"WARNING: Not enough data points for ATR({period}). Need at least {period+1}, have {len(result_df)}", file=sys.stderr)
            
        # Stochastic
        elif indicator_type in ['stochastic', 'stoch', 'stochasticoscillator']:
            k_period = params.get('kPeriod', 14)
            d_period = params.get('dPeriod', 3)
            slowing = params.get('slowing', 1)
            print(f"Calculating Stochastic with kPeriod={k_period}, dPeriod={d_period}, slowing={slowing}", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) >= k_period + d_period:
                stoch = calculate_stochastic(
                    result_df['high'].values, 
                    result_df['low'].values, 
                    result_df['close'].values, 
                    k_period, 
                    d_period,
                    slowing
                )
                result_df['stoch_k'] = stoch['k']
                result_df['stoch_d'] = stoch['d']
            else:
                print(f"WARNING: Not enough data points for Stochastic. Need at least {k_period+d_period}, have {len(result_df)}", file=sys.stderr)
        
        # Weighted Moving Average
        elif indicator_type in ['wma']:
            period = params.get('period', 20)
            print(f"Calculating WMA with period={period}", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) >= period:
                result_df[f'wma_{period}'] = calculate_wma(result_df['close'].values, period)
            else:
                print(f"WARNING: Not enough data points for WMA({period}). Need at least {period}, have {len(result_df)}", file=sys.stderr)
            
        # Volume Weighted Average Price
        elif indicator_type in ['vwap']:
            period = params.get('period', None)
            print(f"Calculating VWAP with period={period}", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) > 0:
                result_df['vwap'] = calculate_vwap(result_df['close'].values, result_df['volume'].values, period)
            else:
                print(f"WARNING: Not enough data points for VWAP. Need at least 1, have {len(result_df)}", file=sys.stderr)
                
        # Parabolic SAR
        elif indicator_type in ['psar', 'parabolicsar']:
            af_start = params.get('afStart', 0.02)
            af_increment = params.get('afIncrement', 0.02)
            af_max = params.get('afMax', 0.2)
            print(f"Calculating Parabolic SAR with afStart={af_start}, afIncrement={af_increment}, afMax={af_max}", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) >= 2:
                result_df['psar'] = calculate_parabolic_sar(
                    result_df['high'].values, 
                    result_df['low'].values, 
                    result_df['close'].values, 
                    af_start, 
                    af_increment, 
                    af_max
                )
            else:
                print(f"WARNING: Not enough data points for Parabolic SAR. Need at least 2, have {len(result_df)}", file=sys.stderr)
        
        # Williams %R
        elif indicator_type in ['williamsr', 'williams%r', 'percentr']:
            period = params.get('period', 14)
            print(f"Calculating Williams %R with period={period}", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) >= period:
                result_df['williams_r'] = calculate_williams_r(
                    result_df['high'].values, 
                    result_df['low'].values, 
                    result_df['close'].values, 
                    period
                )
            else:
                print(f"WARNING: Not enough data points for Williams %R. Need at least {period}, have {len(result_df)}", file=sys.stderr)
        
        # Commodity Channel Index
        elif indicator_type in ['cci']:
            period = params.get('period', 20)
            print(f"Calculating CCI with period={period}", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) >= period:
                result_df['cci'] = calculate_cci(
                    result_df['high'].values, 
                    result_df['low'].values, 
                    result_df['close'].values, 
                    period
                )
            else:
                print(f"WARNING: Not enough data points for CCI. Need at least {period}, have {len(result_df)}", file=sys.stderr)
        
        # Money Flow Index
        elif indicator_type in ['mfi']:
            period = params.get('period', 14)
            print(f"Calculating MFI with period={period}", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) >= period + 1:  # +1 for price changes
                result_df['mfi'] = calculate_mfi(
                    result_df['high'].values, 
                    result_df['low'].values, 
                    result_df['close'].values,
                    result_df['volume'].values,
                    period
                )
            else:
                print(f"WARNING: Not enough data points for MFI. Need at least {period+1}, have {len(result_df)}", file=sys.stderr)
        
        # On-Balance Volume
        elif indicator_type in ['obv']:
            print(f"Calculating OBV", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) >= 2:  # Need at least 2 points to calculate change
                result_df['obv'] = calculate_obv(
                    result_df['close'].values,
                    result_df['volume'].values
                )
            else:
                print(f"WARNING: Not enough data points for OBV. Need at least 2, have {len(result_df)}", file=sys.stderr)
        
        # Average Directional Index
        elif indicator_type in ['adx']:
            period = params.get('period', 14)
            print(f"Calculating ADX with period={period}", file=sys.stderr)
            # Make sure we have enough data points for calculation
            if len(result_df) >= 2 * period:  # ADX requires 2x periods
                adx_result = calculate_adx(
                    result_df['high'].values, 
                    result_df['low'].values, 
                    result_df['close'].values, 
                    period
                )
                result_df['adx'] = adx_result['adx']
                result_df['plus_di'] = adx_result['plus_di']
                result_df['minus_di'] = adx_result['minus_di']
            else:
                print(f"WARNING: Not enough data points for ADX. Need at least {2*period}, have {len(result_df)}", file=sys.stderr)
     
    # Remove potential NaN values that could cause plotting issues
    print(f"Filling NaN values in indicator columns", file=sys.stderr)
    # Forward fill first, then backward fill to handle NaNs at the beginning
    result_df = result_df.ffill().bfill()
    
    # Make sure there are no NaN values left
    print(f"Checking for remaining NaN values after filling...", file=sys.stderr)
    nan_columns = result_df.columns[result_df.isna().any()].tolist()
    if nan_columns:
        print(f"WARNING: The following columns still have NaN values after filling: {nan_columns}", file=sys.stderr)
        # Replace any remaining NaNs with zeros
        result_df = result_df.fillna(0)
        print(f"Replaced remaining NaN values with zeros", file=sys.stderr)
    else:
        print(f"No NaN values found in DataFrame", file=sys.stderr)
    
    return result_df
