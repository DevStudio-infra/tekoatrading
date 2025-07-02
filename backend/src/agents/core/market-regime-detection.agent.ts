import { BaseAgent } from "../../ai/base-agent";
import { logger } from "../../logger";

export interface MarketData {
  symbol: string;
  timeframe: string;
  ohlcData: CandleStick[];
  volume: number[];
  timestamp: Date;
}

export interface CandleStick {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

export interface MarketRegimeAnalysis {
  primaryRegime: "TRENDING" | "RANGING" | "BREAKOUT" | "VOLATILE" | "CONSOLIDATION";
  subRegime: string;
  confidence: number;
  regimeStrength: number;
  trendDirection: "BULLISH" | "BEARISH" | "NEUTRAL";
  trendStrength: number;
  volatilityRank: "VERY_LOW" | "LOW" | "NORMAL" | "HIGH" | "VERY_HIGH";
  momentumStrength: number;
  supportLevel: number;
  resistanceLevel: number;
  keyLevels: number[];
  sessionType: "ASIAN" | "LONDON" | "NEW_YORK" | "OVERLAP";
  sessionCharacteristics: string[];
  timeBasedFactors: string[];
  technicalIndicators: {
    atr: number;
    adx: number;
    rsi: number;
    macdSignal: "BULLISH" | "BEARISH" | "NEUTRAL";
    bollingerPosition: "UPPER" | "MIDDLE" | "LOWER" | "SQUEEZE";
    volumeProfile: "INCREASING" | "DECREASING" | "STABLE";
  };
  marketStructure: {
    higherHighs: boolean;
    higherLows: boolean;
    lowerHighs: boolean;
    lowerLows: boolean;
    structureBroken: boolean;
  };
  tradingImplications: {
    recommendedStrategy:
      | "TREND_FOLLOWING"
      | "MEAN_REVERSION"
      | "BREAKOUT"
      | "RANGE_TRADING"
      | "MOMENTUM";
    entrySignalStrength: number;
    exitSignalStrength: number;
    riskAdjustment: number;
    positionSizeAdjustment: number;
  };
  warnings: string[];
  recommendations: string[];
  nextReviewTime: Date;
}

export class MarketRegimeDetectionAgent extends BaseAgent {
  constructor() {
    super("MarketRegimeDetectionAgent");
  }

  async analyze(data: MarketData): Promise<MarketRegimeAnalysis> {
    return this.analyzeMarketRegime(data);
  }

  async analyzeMarketRegime(marketData: MarketData): Promise<MarketRegimeAnalysis> {
    try {
      logger.info(
        `[MARKET-REGIME] Analyzing market regime for ${marketData.symbol} ${marketData.timeframe}`,
      );

      // Calculate technical indicators
      const technicalIndicators = this.calculateTechnicalIndicators(marketData.ohlcData);

      // Analyze market structure
      const marketStructure = this.analyzeMarketStructure(marketData.ohlcData);

      // Detect primary regime
      const regimeClassification = this.classifyMarketRegime(
        marketData.ohlcData,
        technicalIndicators,
        marketStructure,
      );

      // Analyze session characteristics
      const sessionAnalysis = this.analyzeSessionCharacteristics(marketData);

      // Determine key levels
      const keyLevels = this.identifyKeyLevels(marketData.ohlcData);

      // Generate trading implications
      const tradingImplications = this.generateTradingImplications(
        regimeClassification,
        technicalIndicators,
        marketStructure,
      );

      // Generate warnings and recommendations
      const { warnings, recommendations } = this.generateWarningsAndRecommendations(
        regimeClassification,
        technicalIndicators,
        marketData,
      );

      const analysis: MarketRegimeAnalysis = {
        ...regimeClassification,
        ...keyLevels,
        sessionType: sessionAnalysis.sessionType,
        sessionCharacteristics: sessionAnalysis.characteristics,
        timeBasedFactors: sessionAnalysis.timeFactors,
        technicalIndicators,
        marketStructure,
        tradingImplications,
        warnings,
        recommendations,
        nextReviewTime: this.calculateNextReviewTime(marketData.timeframe),
      };

      logger.info(
        `[MARKET-REGIME] ${marketData.symbol} classified as ${analysis.primaryRegime} (${analysis.subRegime}) with ${(analysis.confidence * 100).toFixed(1)}% confidence`,
      );

      return analysis;
    } catch (error) {
      logger.error(`[MARKET-REGIME] Error analyzing market regime:`, error);
      return this.getDefaultRegimeAnalysis(marketData);
    }
  }

  private calculateTechnicalIndicators(ohlcData: CandleStick[]) {
    const closes = ohlcData.map((c) => c.close);
    const volumes = ohlcData.map((c) => c.volume);

    const atr = this.calculateATR(ohlcData.slice(-14));
    const adx = this.calculateADX(ohlcData.slice(-14));
    const rsi = this.calculateRSI(closes.slice(-14));
    const macdSignal = this.calculateMACDSignal(closes.slice(-26));
    const bollingerPosition = this.calculateBollingerPosition(closes.slice(-20));
    const volumeProfile = this.calculateVolumeProfile(volumes.slice(-10));

    return {
      atr,
      adx,
      rsi,
      macdSignal,
      bollingerPosition,
      volumeProfile,
    };
  }

  private analyzeMarketStructure(ohlcData: CandleStick[]) {
    const recentData = ohlcData.slice(-20);

    const swingHighs = this.findSwingPoints(recentData, "high");
    const swingLows = this.findSwingPoints(recentData, "low");

    const higherHighs = this.detectHigherHighs(swingHighs);
    const higherLows = this.detectHigherLows(swingLows);
    const lowerHighs = this.detectLowerHighs(swingHighs);
    const lowerLows = this.detectLowerLows(swingLows);

    const structureBroken = this.detectStructureBreak(recentData);

    return {
      higherHighs,
      higherLows,
      lowerHighs,
      lowerLows,
      structureBroken,
    };
  }

  private classifyMarketRegime(ohlcData: CandleStick[], indicators: any, structure: any) {
    const recentData = ohlcData.slice(-20);
    const avgPrice = recentData.reduce((sum, c) => sum + c.close, 0) / recentData.length;

    let primaryRegime: any = "RANGING";
    let subRegime = "TIGHT_RANGE";
    let confidence = 0.6;
    let regimeStrength = 5;
    let trendDirection: any = "NEUTRAL";
    let trendStrength = 5;
    let volatilityRank: any = "NORMAL";
    let momentumStrength = 5;

    // Trend Detection
    if (indicators.adx > 25 && structure.higherHighs && structure.higherLows) {
      primaryRegime = "TRENDING";
      trendDirection = "BULLISH";
      subRegime = indicators.adx > 40 ? "STRONG_UPTREND" : "WEAK_UPTREND";
      confidence = 0.8;
      regimeStrength = Math.min(10, Math.floor(indicators.adx / 5));
    } else if (indicators.adx > 25 && structure.lowerHighs && structure.lowerLows) {
      primaryRegime = "TRENDING";
      trendDirection = "BEARISH";
      subRegime = indicators.adx > 40 ? "STRONG_DOWNTREND" : "WEAK_DOWNTREND";
      confidence = 0.8;
      regimeStrength = Math.min(10, Math.floor(indicators.adx / 5));
    }

    // Volatility Detection
    if (indicators.atr / avgPrice > 0.03) {
      volatilityRank = indicators.atr / avgPrice > 0.05 ? "VERY_HIGH" : "HIGH";
      if (primaryRegime === "RANGING") {
        primaryRegime = "VOLATILE";
        subRegime = "HIGH_VOLATILITY";
        confidence = 0.7;
      }
    } else if (indicators.atr / avgPrice < 0.01) {
      volatilityRank = "LOW";
    }

    // Breakout Detection
    if (
      indicators.bollingerPosition === "UPPER" &&
      structure.structureBroken &&
      indicators.volumeProfile === "INCREASING"
    ) {
      primaryRegime = "BREAKOUT";
      subRegime = "BULLISH_BREAKOUT";
      confidence = 0.75;
      momentumStrength = 8;
    } else if (
      indicators.bollingerPosition === "LOWER" &&
      structure.structureBroken &&
      indicators.volumeProfile === "INCREASING"
    ) {
      primaryRegime = "BREAKOUT";
      subRegime = "BEARISH_BREAKOUT";
      confidence = 0.75;
      momentumStrength = 8;
    }

    return {
      primaryRegime,
      subRegime,
      confidence,
      regimeStrength,
      trendDirection,
      trendStrength: Math.min(10, regimeStrength),
      volatilityRank,
      momentumStrength,
    };
  }

  private analyzeSessionCharacteristics(marketData: MarketData) {
    const now = new Date();
    const hour = now.getUTCHours();

    let sessionType: any = "ASIAN";
    let characteristics: string[] = [];
    let timeFactors: string[] = [];

    if (hour >= 0 && hour < 8) {
      sessionType = "ASIAN";
      characteristics = ["Lower volatility", "Range-bound trading"];
      timeFactors = ["Thin liquidity", "Respect support/resistance"];
    } else if (hour >= 8 && hour < 13) {
      sessionType = "LONDON";
      characteristics = ["High volatility", "Trend initiation"];
      timeFactors = ["EUR strength", "Major news impact"];
    } else if (hour >= 13 && hour < 21) {
      sessionType = "NEW_YORK";
      characteristics = ["Maximum volatility", "Trend continuation"];
      timeFactors = ["US data releases", "USD strength"];
    } else {
      sessionType = "OVERLAP";
      characteristics = ["Mixed signals", "Transition period"];
      timeFactors = ["Session transition", "Lower volume"];
    }

    return { sessionType, characteristics, timeFactors };
  }

  private identifyKeyLevels(ohlcData: CandleStick[]) {
    const recentData = ohlcData.slice(-50);
    const highs = recentData.map((c) => c.high);
    const lows = recentData.map((c) => c.low);
    const closes = recentData.map((c) => c.close);

    const resistanceLevel = Math.max(...highs.slice(-20));
    const supportLevel = Math.min(...lows.slice(-20));

    const keyLevels = [supportLevel, resistanceLevel, closes[closes.length - 1]].sort(
      (a, b) => a - b,
    );

    return {
      supportLevel,
      resistanceLevel,
      keyLevels: [...new Set(keyLevels)],
    };
  }

  private generateTradingImplications(regimeClassification: any, indicators: any, structure: any) {
    let recommendedStrategy: any = "RANGE_TRADING";
    let entrySignalStrength = 5;
    let exitSignalStrength = 5;
    let riskAdjustment = 1.0;
    let positionSizeAdjustment = 1.0;

    switch (regimeClassification.primaryRegime) {
      case "TRENDING":
        recommendedStrategy = "TREND_FOLLOWING";
        entrySignalStrength = regimeClassification.regimeStrength;
        exitSignalStrength = 6;
        riskAdjustment = 0.8;
        positionSizeAdjustment = 1.2;
        break;

      case "BREAKOUT":
        recommendedStrategy = "BREAKOUT";
        entrySignalStrength = 8;
        exitSignalStrength = 7;
        riskAdjustment = 1.5;
        positionSizeAdjustment = 0.8;
        break;

      case "VOLATILE":
        recommendedStrategy = "MOMENTUM";
        entrySignalStrength = 6;
        exitSignalStrength = 8;
        riskAdjustment = 1.8;
        positionSizeAdjustment = 0.6;
        break;

      case "RANGING":
        recommendedStrategy = "MEAN_REVERSION";
        entrySignalStrength = 7;
        exitSignalStrength = 6;
        riskAdjustment = 1.0;
        positionSizeAdjustment = 1.0;
        break;
    }

    return {
      recommendedStrategy,
      entrySignalStrength,
      exitSignalStrength,
      riskAdjustment,
      positionSizeAdjustment,
    };
  }

  private generateWarningsAndRecommendations(
    regimeClassification: any,
    indicators: any,
    marketData: MarketData,
  ) {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (regimeClassification.primaryRegime === "VOLATILE" && indicators.atr > 0.05) {
      warnings.push("⚠️ Extremely high volatility detected - exercise caution");
      recommendations.push("Reduce position sizes and tighten stop losses");
    }

    if (regimeClassification.confidence < 0.6) {
      warnings.push("🤔 Market regime uncertainty - mixed signals detected");
      recommendations.push("Wait for clearer regime confirmation before major trades");
    }

    if (regimeClassification.primaryRegime === "TRENDING") {
      recommendations.push("✅ Strong trend detected - consider trend-following strategies");
    }

    if (regimeClassification.primaryRegime === "RANGING") {
      recommendations.push("↔️ Range-bound market - use mean reversion strategies");
    }

    if (recommendations.length === 0) {
      recommendations.push("📊 Monitor market conditions for regime changes");
    }

    return { warnings, recommendations };
  }

  // Technical indicator calculations (simplified)
  private calculateATR(data: CandleStick[]): number {
    if (data.length < 2) return 0.02;

    let trSum = 0;
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;

      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trSum += tr;
    }

    return trSum / (data.length - 1) / data[data.length - 1].close;
  }

  private calculateADX(data: CandleStick[]): number {
    if (data.length < 2) return 20;

    let upMoves = 0;
    let downMoves = 0;

    for (let i = 1; i < data.length; i++) {
      const upMove = data[i].high - data[i - 1].high;
      const downMove = data[i - 1].low - data[i].low;

      if (upMove > downMove && upMove > 0) upMoves++;
      if (downMove > upMove && downMove > 0) downMoves++;
    }

    const totalMoves = upMoves + downMoves;
    if (totalMoves === 0) return 15;

    return (Math.abs(upMoves - downMoves) / totalMoves) * 100;
  }

  private calculateRSI(closes: number[]): number {
    if (closes.length < 2) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - 100 / (1 + rs);
  }

  private calculateMACDSignal(closes: number[]): "BULLISH" | "BEARISH" | "NEUTRAL" {
    if (closes.length < 12) return "NEUTRAL";

    const ema12 = closes.slice(-12).reduce((a, b) => a + b, 0) / 12;
    const ema26 = closes.slice(-26).reduce((a, b) => a + b, 0) / 26;
    const macdLine = ema12 - ema26;

    return macdLine > 0 ? "BULLISH" : macdLine < 0 ? "BEARISH" : "NEUTRAL";
  }

  private calculateBollingerPosition(closes: number[]): "UPPER" | "MIDDLE" | "LOWER" | "SQUEEZE" {
    if (closes.length < 20) return "MIDDLE";

    const sma = closes.reduce((a, b) => a + b, 0) / closes.length;
    const variance =
      closes.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / closes.length;
    const stdDev = Math.sqrt(variance);

    const currentPrice = closes[closes.length - 1];
    const upperBand = sma + 2 * stdDev;
    const lowerBand = sma - 2 * stdDev;

    if (stdDev / sma < 0.01) return "SQUEEZE";
    if (currentPrice > upperBand * 0.98) return "UPPER";
    if (currentPrice < lowerBand * 1.02) return "LOWER";
    return "MIDDLE";
  }

  private calculateVolumeProfile(volumes: number[]): "INCREASING" | "DECREASING" | "STABLE" {
    if (volumes.length < 5) return "STABLE";

    const recent = volumes.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const previous = volumes.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
    const change = (recent - previous) / previous;

    if (change > 0.1) return "INCREASING";
    if (change < -0.1) return "DECREASING";
    return "STABLE";
  }

  // Market structure analysis methods
  private findSwingPoints(data: CandleStick[], type: "high" | "low"): number[] {
    const values = data.map((c) => (type === "high" ? c.high : c.low));
    const swingPoints: number[] = [];

    for (let i = 2; i < values.length - 2; i++) {
      if (type === "high") {
        if (
          values[i] > values[i - 1] &&
          values[i] > values[i - 2] &&
          values[i] > values[i + 1] &&
          values[i] > values[i + 2]
        ) {
          swingPoints.push(values[i]);
        }
      } else {
        if (
          values[i] < values[i - 1] &&
          values[i] < values[i - 2] &&
          values[i] < values[i + 1] &&
          values[i] < values[i + 2]
        ) {
          swingPoints.push(values[i]);
        }
      }
    }

    return swingPoints;
  }

  private detectHigherHighs(swingHighs: number[]): boolean {
    if (swingHighs.length < 2) return false;
    return swingHighs[swingHighs.length - 1] > swingHighs[swingHighs.length - 2];
  }

  private detectHigherLows(swingLows: number[]): boolean {
    if (swingLows.length < 2) return false;
    return swingLows[swingLows.length - 1] > swingLows[swingLows.length - 2];
  }

  private detectLowerHighs(swingHighs: number[]): boolean {
    if (swingHighs.length < 2) return false;
    return swingHighs[swingHighs.length - 1] < swingHighs[swingHighs.length - 2];
  }

  private detectLowerLows(swingLows: number[]): boolean {
    if (swingLows.length < 2) return false;
    return swingLows[swingLows.length - 1] < swingLows[swingLows.length - 2];
  }

  private detectStructureBreak(data: CandleStick[]): boolean {
    if (data.length < 10) return false;

    const recent = data.slice(-5);
    const previous = data.slice(-10, -5);

    const recentHigh = Math.max(...recent.map((c) => c.high));
    const recentLow = Math.min(...recent.map((c) => c.low));
    const previousHigh = Math.max(...previous.map((c) => c.high));
    const previousLow = Math.min(...previous.map((c) => c.low));

    return recentHigh > previousHigh * 1.02 || recentLow < previousLow * 0.98;
  }

  private calculateNextReviewTime(timeframe: string): Date {
    const now = new Date();
    const intervals = {
      M1: 5,
      M5: 15,
      M15: 30,
      M30: 60,
      H1: 120,
      H4: 240,
      D1: 480,
    };

    const interval = intervals[timeframe as keyof typeof intervals] || 60;
    return new Date(now.getTime() + interval * 60000);
  }

  private getDefaultRegimeAnalysis(marketData: MarketData): MarketRegimeAnalysis {
    return {
      primaryRegime: "RANGING",
      subRegime: "TIGHT_RANGE",
      confidence: 0.5,
      regimeStrength: 5,
      trendDirection: "NEUTRAL",
      trendStrength: 5,
      volatilityRank: "NORMAL",
      momentumStrength: 5,
      supportLevel: 0,
      resistanceLevel: 0,
      keyLevels: [],
      sessionType: "NEW_YORK",
      sessionCharacteristics: ["Default analysis"],
      timeBasedFactors: ["Error in calculation"],
      technicalIndicators: {
        atr: 0.02,
        adx: 20,
        rsi: 50,
        macdSignal: "NEUTRAL",
        bollingerPosition: "MIDDLE",
        volumeProfile: "STABLE",
      },
      marketStructure: {
        higherHighs: false,
        higherLows: false,
        lowerHighs: false,
        lowerLows: false,
        structureBroken: false,
      },
      tradingImplications: {
        recommendedStrategy: "RANGE_TRADING",
        entrySignalStrength: 5,
        exitSignalStrength: 5,
        riskAdjustment: 1.0,
        positionSizeAdjustment: 1.0,
      },
      warnings: ["Error in market regime analysis - using defaults"],
      recommendations: ["Manual review recommended"],
      nextReviewTime: new Date(Date.now() + 60000),
    };
  }
}
