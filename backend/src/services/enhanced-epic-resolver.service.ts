import { logger } from "../logger";

/**
 * 🧠 Enhanced Epic Resolver Service
 * Uses AI to automatically discover correct Capital.com epics for any trading symbol
 */
export class EnhancedEpicResolverService {
  private epicCache: Map<string, string> = new Map();
  private lastSuccessfulEpics: Map<string, { epic: string; timestamp: Date }> = new Map();

  // Base known mappings from working system
  private baseKnownMappings: Map<string, string> = new Map([
    // Crypto pairs - Known working formats
    ["BTC/USD", "BTCUSD"],
    ["BTCUSD", "BTCUSD"],
    ["BITCOIN", "BTCUSD"],
    ["ETH/USD", "ETHUSD"],
    ["ETHUSD", "ETHUSD"],
    ["LTC/USD", "LTCUSD"],
    ["LTCUSD", "LTCUSD"],
    ["XRP/USD", "XRPUSD"],
    ["XRPUSD", "XRPUSD"],
    ["ADA/USD", "ADAUSD"],
    ["ADAUSD", "ADAUSD"],
  ]);

  /**
   * 🎯 Smart Epic Resolution with Multiple Fallback Strategies
   */
  async resolveEpic(symbol: string, capitalApi: any): Promise<string | null> {
    const normalizedSymbol = this.normalizeSymbol(symbol);

    logger.info(`📊 Resolving epic for symbol: ${symbol}`);
    logger.info(`🔍 Looking for epic for symbol: ${symbol} (normalized: ${normalizedSymbol})`);

    // 1. Check cache first
    if (this.epicCache.has(normalizedSymbol)) {
      const cachedEpic = this.epicCache.get(normalizedSymbol)!;
      logger.info(`📋 Found in cache: ${normalizedSymbol} → ${cachedEpic}`);
      return cachedEpic;
    }

    // 2. Check base known mappings
    if (this.baseKnownMappings.has(symbol) || this.baseKnownMappings.has(normalizedSymbol)) {
      const epic =
        this.baseKnownMappings.get(symbol) || this.baseKnownMappings.get(normalizedSymbol)!;
      logger.info(`📋 Found in known mappings: ${symbol} → ${epic}`);

      // Test if this epic actually works
      if (await this.testEpicWithCapitalApi(epic, capitalApi)) {
        this.epicCache.set(normalizedSymbol, epic);
        return epic;
      }
    }

    // 3. Try multiple resolution strategies
    const strategies = [
      () => this.tryDirectMapping(symbol, capitalApi),
      () => this.trySearchBasedResolution(symbol, capitalApi),
      () => this.tryAIAssistedResolution(symbol, capitalApi),
      () => this.tryFallbackCandidates(symbol, capitalApi),
    ];

    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result) {
          logger.info(`✅ Epic resolved using strategy: ${normalizedSymbol} → ${result}`);
          this.epicCache.set(normalizedSymbol, result);
          this.lastSuccessfulEpics.set(normalizedSymbol, { epic: result, timestamp: new Date() });
          return result;
        }
      } catch (error) {
        logger.warn(`⚠️ Epic resolution strategy failed: ${error}`);
      }
    }

    logger.error(`❌ All epic resolution strategies failed for symbol: ${symbol}`);
    return null;
  }

  /**
   * 🧠 AI-Assisted Epic Discovery
   * Uses LLM to intelligently map trading symbols to Capital.com epics
   */
  private async tryAIAssistedResolution(symbol: string, capitalApi: any): Promise<string | null> {
    try {
      const { EnhancedTradingDecisionAgent } = await import(
        "../ai/enhanced-trading-decision-agent"
      );
      const aiAgent = new EnhancedTradingDecisionAgent();

      logger.info(`🧠 Using AI to resolve epic for ${symbol}...`);

      const prompt = `You are an expert in Capital.com trading platform API integration.

TASK: Determine the correct Capital.com epic (market identifier) for the trading symbol: "${symbol}"

CONTEXT:
- Capital.com uses specific epic formats for different asset classes
- Crypto pairs often use simple format like "BTCUSD", "ETHUSD"
- Forex pairs use format like "CS.D.EURUSD.MINI.IP"
- Indices use format like "CS.D.SPXUSD.CFD.IP"
- Commodities use format like "CS.D.GOLD.CFD.IP"

KNOWN WORKING EXAMPLES:
- BTC/USD → BTCUSD
- ETH/USD → ETHUSD
- EUR/USD → CS.D.EURUSD.MINI.IP
- S&P500 → CS.D.SPXUSD.CFD.IP
- Gold → CS.D.GOLD.CFD.IP

Generate 5 most likely epic candidates for "${symbol}" in order of probability:

Respond in this exact JSON format:
{
  "symbol": "${symbol}",
  "candidates": [
    "most_likely_epic",
    "second_choice",
    "third_choice",
    "fourth_choice",
    "fifth_choice"
  ],
  "reasoning": "Brief explanation of why these candidates were chosen"
}`;

      const aiResponse = await aiAgent.queryLLM(prompt, {
        temperature: 0.1, // Low temperature for precise technical responses
        max_tokens: 500,
      });

      // Parse AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiResult = JSON.parse(jsonMatch[0]);

        logger.info(`🧠 AI suggested epics for ${symbol}: ${aiResult.candidates.join(", ")}`);
        logger.info(`💡 AI reasoning: ${aiResult.reasoning}`);

        // Test each candidate
        for (const candidate of aiResult.candidates) {
          if (await this.testEpicWithCapitalApi(candidate, capitalApi)) {
            logger.info(`✅ AI-suggested epic works: ${symbol} → ${candidate}`);
            return candidate;
          }
        }
      }

      logger.warn(`❌ None of the AI-suggested epics worked for ${symbol}`);
      return null;
    } catch (error) {
      logger.error(`❌ AI-assisted epic resolution failed: ${error}`);
      return null;
    }
  }

  /**
   * 🔍 Search-Based Epic Discovery
   */
  private async trySearchBasedResolution(symbol: string, capitalApi: any): Promise<string | null> {
    try {
      logger.info(`🔍 Searching Capital.com markets for: ${symbol}`);

      const searchTerms = this.generateSearchTerms(symbol);

      for (const searchTerm of searchTerms) {
        try {
          const markets = await capitalApi.searchMarkets(searchTerm);

          if (markets && markets.length > 0) {
            const bestMatch = this.findBestMarketMatch(symbol, markets);

            if (bestMatch && (await this.testEpicWithCapitalApi(bestMatch.epic, capitalApi))) {
              logger.info(`✅ Search found working epic: ${symbol} → ${bestMatch.epic}`);
              return bestMatch.epic;
            }
          }
        } catch (searchError) {
          logger.warn(`Search term "${searchTerm}" failed: ${searchError}`);
        }
      }

      return null;
    } catch (error) {
      logger.error(`❌ Search-based resolution failed: ${error}`);
      return null;
    }
  }

  /**
   * 🎯 Direct Mapping Strategy
   */
  private async tryDirectMapping(symbol: string, capitalApi: any): Promise<string | null> {
    const candidates = this.generateDirectCandidates(symbol);

    logger.info(`📋 Testing known mapping: ${symbol} → ${candidates[0]}`);

    for (const candidate of candidates) {
      if (await this.testEpicWithCapitalApi(candidate, capitalApi)) {
        logger.info(`✅ Direct mapping works: ${symbol} → ${candidate}`);
        return candidate;
      }
    }

    return null;
  }

  /**
   * 🆘 Fallback Candidates Strategy
   */
  private async tryFallbackCandidates(symbol: string, capitalApi: any): Promise<string | null> {
    const fallbackCandidates = this.generateFallbackCandidates(symbol);

    for (const candidate of fallbackCandidates) {
      if (await this.testEpicWithCapitalApi(candidate, capitalApi)) {
        logger.info(`✅ Fallback candidate works: ${symbol} → ${candidate}`);
        return candidate;
      }
    }

    return null;
  }

  /**
   * 🧪 Test Epic with Capital.com API
   */
  private async testEpicWithCapitalApi(epic: string, capitalApi: any): Promise<boolean> {
    try {
      // Test with historical prices (most reliable test)
      const prices = await capitalApi.getHistoricalPrices(epic, "DAY", 5);

      if (prices && prices.length > 0) {
        logger.info(`✅ Epic ${epic} works with DAY resolution (${prices.length} data points)`);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 🔄 Normalize Symbol
   */
  private normalizeSymbol(symbol: string): string {
    return symbol.replace(/[\\/\\-_]/g, "").toUpperCase();
  }

  /**
   * 📝 Generate Direct Candidates
   */
  private generateDirectCandidates(symbol: string): string[] {
    const normalized = this.normalizeSymbol(symbol);

    return [
      normalized, // BTCUSD
      symbol, // BTC/USD
      symbol.replace("/", ""), // BTCUSD
      `${symbol.split("/")[0]}USD`, // BTCUSD
    ];
  }

  /**
   * 🔍 Generate Search Terms
   */
  private generateSearchTerms(symbol: string): string[] {
    const parts = symbol.split("/");
    const base = parts[0];

    return [
      symbol, // BTC/USD
      symbol.replace("/", ""), // BTCUSD
      base, // BTC
      symbol.replace("/", " "), // BTC USD
      base.toLowerCase(), // btc
    ];
  }

  /**
   * 🎯 Find Best Market Match
   */
  private findBestMarketMatch(symbol: string, markets: any[]): any | null {
    const normalizedSymbol = this.normalizeSymbol(symbol);

    // Prioritize exact matches
    for (const market of markets) {
      const marketSymbol = (market.symbol || "").toUpperCase();
      const marketName = (market.instrumentName || "").toUpperCase();

      if (
        marketSymbol === normalizedSymbol ||
        marketName.includes(normalizedSymbol) ||
        marketName.includes(symbol.split("/")[0])
      ) {
        return market;
      }
    }

    // Return first result if no exact match
    return markets[0];
  }

  /**
   * 🆘 Generate Fallback Candidates
   */
  private generateFallbackCandidates(symbol: string): string[] {
    const normalized = this.normalizeSymbol(symbol);
    const base = symbol.split("/")[0];

    return [
      // Common crypto formats
      `${base}USD`,
      `${base}/USD`,
      `${base}USDT`,

      // Common forex formats (if applicable)
      `CS.D.${normalized}.MINI.IP`,
      `CS.D.${normalized}.CFD.IP`,

      // Index formats (if applicable)
      `CS.D.${normalized.replace("USD", "")}.CFD.IP`,
    ];
  }

  /**
   * 📊 Get Cache Statistics
   */
  getCacheStats(): { size: number; successfulMappings: number } {
    return {
      size: this.epicCache.size,
      successfulMappings: this.lastSuccessfulEpics.size,
    };
  }

  /**
   * 🧹 Clear Cache
   */
  clearCache(): void {
    this.epicCache.clear();
    this.lastSuccessfulEpics.clear();
    logger.info("🧹 Epic cache cleared");
  }
}

// Export singleton instance
export const enhancedEpicResolverService = new EnhancedEpicResolverService();
