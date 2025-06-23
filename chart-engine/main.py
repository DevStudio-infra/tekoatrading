from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import mplfinance as mpf
import pandas as pd
import numpy as np
import yfinance as yf
import io
import base64
from typing import Optional, List
import talib

app = FastAPI(title="Tekoa Chart Engine")

class ChartRequest(BaseModel):
    symbol: str
    timeframe: str = "1d"
    period: str = "30d"
    indicators: Optional[List[str]] = None
    chart_type: str = "candle"

class IndicatorRequest(BaseModel):
    symbol: str
    timeframe: str = "1d"
    period: str = "30d"
    indicator: str
    params: Optional[dict] = None

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/generate-chart")
async def generate_chart(request: ChartRequest):
    try:
        # Fetch data
        ticker = yf.Ticker(request.symbol)
        data = ticker.history(period=request.period, interval=request.timeframe)

        if data.empty:
            raise HTTPException(status_code=404, detail="No data found for symbol")

        # Add technical indicators if requested
        add_plots = []
        if request.indicators:
            for indicator in request.indicators:
                if indicator.lower() == "sma20":
                    data['SMA20'] = talib.SMA(data['Close'], timeperiod=20)
                    add_plots.append(mpf.make_addplot(data['SMA20'], color='blue'))
                elif indicator.lower() == "sma50":
                    data['SMA50'] = talib.SMA(data['Close'], timeperiod=50)
                    add_plots.append(mpf.make_addplot(data['SMA50'], color='red'))
                elif indicator.lower() == "rsi":
                    data['RSI'] = talib.RSI(data['Close'])
                    add_plots.append(mpf.make_addplot(data['RSI'], panel=1, color='purple'))

        # Generate chart
        buf = io.BytesIO()
        style = mpf.make_mpf_style(base_mpf_style='charles', rc={'font.size': 8})

        mpf.plot(data,
                type=request.chart_type,
                style=style,
                addplot=add_plots if add_plots else None,
                volume=True,
                savefig=dict(fname=buf, format='png', bbox_inches='tight', dpi=150))
        buf.seek(0)

        # Convert to base64
        chart_b64 = base64.b64encode(buf.getvalue()).decode()

        return {
            "chart": chart_b64,
            "symbol": request.symbol,
            "data_points": len(data),
            "indicators_applied": request.indicators or []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/calculate-indicator")
async def calculate_indicator(request: IndicatorRequest):
    try:
        # Fetch data
        ticker = yf.Ticker(request.symbol)
        data = ticker.history(period=request.period, interval=request.timeframe)

        if data.empty:
            raise HTTPException(status_code=404, detail="No data found for symbol")

        # Calculate indicator
        result = {}
        indicator = request.indicator.upper()

        if indicator == "SMA":
            period = request.params.get("period", 20) if request.params else 20
            result["values"] = talib.SMA(data['Close'], timeperiod=period).tolist()
            result["name"] = f"SMA({period})"

        elif indicator == "RSI":
            period = request.params.get("period", 14) if request.params else 14
            result["values"] = talib.RSI(data['Close'], timeperiod=period).tolist()
            result["name"] = f"RSI({period})"

        elif indicator == "MACD":
            macd, signal, hist = talib.MACD(data['Close'])
            result["macd"] = macd.tolist()
            result["signal"] = signal.tolist()
            result["histogram"] = hist.tolist()
            result["name"] = "MACD"

        elif indicator == "BOLLINGER":
            upper, middle, lower = talib.BBANDS(data['Close'])
            result["upper"] = upper.tolist()
            result["middle"] = middle.tolist()
            result["lower"] = lower.tolist()
            result["name"] = "Bollinger Bands"

        else:
            raise HTTPException(status_code=400, detail=f"Indicator {indicator} not supported")

        result["symbol"] = request.symbol
        result["dates"] = data.index.strftime('%Y-%m-%d').tolist()

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/supported-indicators")
async def get_supported_indicators():
    return {
        "indicators": [
            {"name": "SMA", "description": "Simple Moving Average", "params": ["period"]},
            {"name": "RSI", "description": "Relative Strength Index", "params": ["period"]},
            {"name": "MACD", "description": "Moving Average Convergence Divergence", "params": []},
            {"name": "BOLLINGER", "description": "Bollinger Bands", "params": ["period", "std_dev"]}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
