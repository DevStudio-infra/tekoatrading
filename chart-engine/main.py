from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import mplfinance as mpf
import pandas as pd
import numpy as np
import yfinance as yf
import io
import base64
from typing import Optional

app = FastAPI(title="Tekoa Chart Engine")

class ChartRequest(BaseModel):
    symbol: str
    timeframe: str = "1d"
    period: str = "30d"
    indicators: Optional[list] = None

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

        # Generate chart
        buf = io.BytesIO()
        mpf.plot(data, type='candle', style='charles',
                 savefig=dict(fname=buf, format='png', bbox_inches='tight'))
        buf.seek(0)

        # Convert to base64
        chart_b64 = base64.b64encode(buf.getvalue()).decode()

        return {
            "chart": chart_b64,
            "symbol": request.symbol,
            "data_points": len(data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
