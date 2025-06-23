import { promises as fs } from "fs";
import * as path from "path";
import axios, { AxiosError } from "axios";
import { spawn } from "child_process";
import http from "http";
import dotenv from "dotenv";
import { getCapitalApiInstance } from "../../capital/services/capital-main.service";
import { brokerFactoryService } from "../../../services/broker-factory.service";
import { brokerCredentialService } from "../../../services/broker-credential.service";
import { loggerService } from "../../../services/logger.service";
import { ChartOptions, HistoricalDataPoint, ChartResult, IndicatorSettings } from "../interfaces/chart-options.interface";
import { ensureOutputDirectory, generateChartFilename, calculateDateRange, generateAsciiChart } from "../utils/chart-utils";
import { CapitalMainService } from "../../capital";
import { CapitalSymbolService } from "../../capital/services/capital-symbol.service";
import { prisma } from "../../../utils/prisma";

// Load environment variables
dotenv.config();

/**
 * Service for generating and managing trading charts
 */
export class ChartEngineService {
  private readonly outputDir: string;
  private frontendPorts: number[] = [3000, 3001, 5173, 5174, 8080]; // Common frontend ports to check
  private activeChartUrl: string | null = null;
  private fallbackServerProcess: any = null;
  private isInitialized: boolean = false;

  constructor() {
    this.outputDir = process.env.CHART_OUTPUT_DIR || path.join(process.cwd(), "chart-output");
    // Will be initialized lazily when first needed
  }

  /**
   * Initialize the chart engine service
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure output directory exists
      await ensureOutputDirectory(this.outputDir);

      // Discover active chart engine (if any)
      await this.discoverChartEngine();

      this.isInitialized = true;
    } catch (error) {
      loggerService.error(`Failed to initialize chart engine service: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Attempt to discover an active chart engine on common frontend ports
   */
  private async discoverChartEngine(): Promise<void> {
    loggerService.info("Discovering chart engine...");

    // Check if CHART_ENGINE_URL is set in environment
    if (process.env.CHART_ENGINE_URL) {
      this.activeChartUrl = process.env.CHART_ENGINE_URL;
      loggerService.info(`Using configured chart engine URL: ${this.activeChartUrl}`);
      return;
    }

    // Try to discover on common ports
    for (const port of this.frontendPorts) {
      const url = `http://localhost:${port}`;
      try {
        const response = await axios.get(`${url}/chart-status`, { timeout: 500 });
        if (response.status === 200 && response.data?.status === "ready") {
          this.activeChartUrl = url;
          loggerService.info(`Discovered chart engine at ${url}`);
          return;
        }
      } catch (error) {
        // Ignore errors, just try next port
      }
    }

    loggerService.warn("No active chart engine discovered, will use fallback chart engine");

    try {
      // Try to start fallback chart engine
      await this.startFallbackChartServer();
      this.activeChartUrl = "http://localhost:5001";
      loggerService.info(`Started fallback chart engine at ${this.activeChartUrl}`);
    } catch (fallbackError) {
      loggerService.error(`Failed to start fallback chart engine: ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`);
      this.activeChartUrl = null;
    }
  }

  /**
   * Start a fallback chart rendering server
   */
  private async startFallbackChartServer(): Promise<void> {
    loggerService.info("Starting fallback chart rendering server...");

    try {
      // Define the fallback server port
      const fallbackPort = 5001;

      // Path to the Python chart renderer script
      const rendererPath = path.join(process.cwd(), "chart-engine", "main.py");

      // Check if the renderer script exists
      try {
        await fs.access(rendererPath);
      } catch (error) {
        loggerService.error(`Python chart renderer not found at ${rendererPath}`);
        throw new Error("Python chart renderer not found");
      }

      // Start the Python fallback server
      const pythonExecutable = process.platform === "win32" ? "python" : "python3";
      this.fallbackServerProcess = spawn(pythonExecutable, [rendererPath], {
        stdio: "pipe",
        detached: true,
        env: { ...process.env, CHART_ENGINE_PORT: fallbackPort.toString() },
      });

      // Handle output
      this.fallbackServerProcess.stdout.on("data", (data: Buffer) => {
        loggerService.debug(`Chart engine output: ${data.toString().trim()}`);
      });

      this.fallbackServerProcess.stderr.on("data", (data: Buffer) => {
        loggerService.error(`Chart engine error: ${data.toString().trim()}`);
      });

      // Handle process exit
      this.fallbackServerProcess.on("close", (code: number) => {
        loggerService.warn(`Chart engine process exited with code ${code}`);
        this.fallbackServerProcess = null;
      });

      // Wait for server to start
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 10;

        const checkServer = () => {
          attempts++;

          http
            .get(`http://localhost:${fallbackPort}/health`, (res) => {
              if (res.statusCode === 200) {
                resolve();
              } else if (attempts < maxAttempts) {
                setTimeout(checkServer, 500);
              } else {
                reject(new Error(`Failed to start chart engine after ${maxAttempts} attempts`));
              }
            })
            .on("error", () => {
              if (attempts < maxAttempts) {
                setTimeout(checkServer, 500);
              } else {
                reject(new Error(`Failed to start chart engine after ${maxAttempts} attempts`));
              }
            });
        };

        // Start checking after a short delay
        setTimeout(checkServer, 1000);
      });
    } catch (error) {
      loggerService.error(`Error starting fallback chart server: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Generate a chart based on the provided options
   *
   * @param options Chart generation options
   * @returns Chart generation result with URL to the chart
   */
  async generateChart(options: ChartOptions): Promise<ChartResult> {
    // Initialize if not already done
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Apply default values
    const chartOptions: ChartOptions = {
      ...options,
      width: options.width || 1200,
      height: options.height || 800,
      theme: options.theme || "dark",
      showVolume: options.showVolume ?? true,
    };

    loggerService.info(`Generating chart for ${chartOptions.symbol}, timeframe: ${chartOptions.timeframe}`);

    // Add timeout wrapper to prevent hanging
    const CHART_GENERATION_TIMEOUT = 120000; // 2 minutes timeout

    const timeoutPromise = new Promise<ChartResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Chart generation timed out after ${CHART_GENERATION_TIMEOUT}ms for ${chartOptions.symbol}`));
      }, CHART_GENERATION_TIMEOUT);
    });

    const chartGenerationPromise = this.generateChartInternal(chartOptions);

    try {
      return await Promise.race([chartGenerationPromise, timeoutPromise]);
    } catch (error) {
      loggerService.error(`Chart generation failed for ${chartOptions.symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Internal chart generation method (separated for timeout handling)
   */
  private async generateChartInternal(options: ChartOptions): Promise<ChartResult> {
    try {
      // Fetch historical data - fail if no real data available
      const historicalData = await this.fetchHistoricalData(options.symbol, options.timeframe);

      if (!historicalData || historicalData.length === 0) {
        throw new Error(`No historical data available for ${options.symbol}. Chart generation failed.`);
      }

      if (this.activeChartUrl) {
        // Use chart engine to generate chart
        return await this.renderChartWithEngine(options, historicalData, options.skipLocalStorage);
      } else {
        throw new Error("No chart engine available and fallback disabled");
      }
    } catch (error) {
      loggerService.error(`Chart generation failed for ${options.symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error; // Re-throw error instead of using fallback
    }
  }

  /**
   * Fetch historical price data for a symbol
   *
   * @param symbol Trading symbol
   * @param timeframe Timeframe for candles
   * @returns Array of historical data points
   */
  private async fetchHistoricalData(symbol: string, timeframe: string): Promise<HistoricalDataPoint[]> {
    try {
      loggerService.info(`Fetching historical data for ${symbol} with timeframe ${timeframe}`);

      // Set a timeout for the entire historical data fetch operation
      const FETCH_TIMEOUT = 60000; // 60 seconds timeout (increased from 30 seconds for Capital.com API)

      const fetchPromise = this.performHistoricalDataFetch(symbol, timeframe);
      const timeoutPromise = new Promise<HistoricalDataPoint[]>((_, reject) => {
        setTimeout(() => reject(new Error(`Historical data fetch timeout after ${FETCH_TIMEOUT}ms`)), FETCH_TIMEOUT);
      });

      // Race between the fetch and timeout
      const historicalData = await Promise.race([fetchPromise, timeoutPromise]);

      if (historicalData && historicalData.length > 0) {
        loggerService.info(`Retrieved ${historicalData.length} historical data points for ${symbol}`);
        return historicalData;
      } else {
        throw new Error(`No historical data returned for ${symbol}`);
      }
    } catch (error) {
      loggerService.error(`Error fetching historical data for ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error; // Re-throw error instead of using fallback data
    }
  }

  /**
   * Perform the actual historical data fetch with broker credentials
   */
  private async performHistoricalDataFetch(symbol: string, timeframe: string): Promise<HistoricalDataPoint[]> {
    try {
      // Get a valid user and broker credentials from database
      interface BrokerCredential {
        id: string;
        userId: string;
        broker: string;
        isActive: boolean;
        credentials: Record<string, any>;
      }

      loggerService.debug("[DEV] Looking up a valid user UUID from the database");
      const user = await prisma.user.findFirst({
        select: { id: true },
      });

      if (!user) {
        throw new Error("No active user found in database");
      }

      loggerService.debug(`[DEV] Using user with UUID: ${user.id}`);

      const credential = (await prisma.brokerCredential.findFirst({
        where: {
          userId: user.id,
          broker: "capital.com",
          isActive: true,
        },
      })) as BrokerCredential | null;

      if (!credential) {
        throw new Error("No active Capital.com credentials found");
      }

      loggerService.info(`Using broker credential: ${credential.id} for chart data`);

      // Create Capital.com API instance with credentials
      const capitalApi = new CapitalMainService(
        credential.credentials.apiKey,
        credential.credentials.identifier,
        credential.credentials.password,
        credential.credentials.isDemo || false
      );

      // Create symbol service to convert symbol to epic
      const symbolService = new CapitalSymbolService({
        apiKey: credential.credentials.apiKey,
        identifier: credential.credentials.identifier,
        password: credential.credentials.password,
        isDemo: credential.credentials.isDemo || false,
      });

      // Convert symbol to epic format
      loggerService.info(`🔄 Converting symbol ${symbol} to Capital.com epic format`);
      const epic = await symbolService.getEpicForSymbol(symbol);

      if (!epic) {
        throw new Error(`Could not find Capital.com epic for symbol: ${symbol}`);
      }

      loggerService.info(`✅ Successfully converted ${symbol} to epic: ${epic}`);

      // Calculate date range and candle count
      const candleCount = this.calculateCandleCount(timeframe);
      const resolution = this.mapTimeframeToResolution(timeframe);
      const { from, to } = calculateDateRange(timeframe, candleCount);

      // Fetch historical prices from Capital.com API with the correct epic with retry logic
      loggerService.info(`Requesting ${candleCount} candles for ${symbol} (epic: ${epic}) with resolution ${resolution}`);

      let response;
      let lastError;
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          loggerService.info(`API call attempt ${attempt}/${maxRetries} for ${symbol}`);
          response = await Promise.race([
            capitalApi.getHistoricalPrices(epic, resolution, from, to, candleCount),
            new Promise(
              (_, reject) => setTimeout(() => reject(new Error("Capital.com API timeout")), 60000) // 60 second timeout for API call (increased from 30 seconds)
            ),
          ]);
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error;
          loggerService.warn(`API call attempt ${attempt}/${maxRetries} failed for ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);

          if (attempt < maxRetries) {
            const delay = attempt * 2000; // Progressive delay: 2s, 4s
            loggerService.info(`Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      if (!response) {
        throw lastError || new Error("All API call attempts failed");
      }

      if (!response?.prices || response.prices.length === 0) {
        loggerService.warn(`No historical prices found for ${symbol} (epic: ${epic})`);
        return [];
      }

      // Define an interface for the Capital API price structure
      interface CapitalPrice {
        snapshotTimeUTC: string;
        openPrice: { bid: number; ask: number };
        highPrice: { bid: number; ask: number };
        lowPrice: { bid: number; ask: number };
        closePrice: { bid: number; ask: number };
        lastTradedVolume?: number;
      }

      // Transform to our format
      const historicalData: HistoricalDataPoint[] = response.prices.map((price: CapitalPrice) => {
        const timestamp = new Date(price.snapshotTimeUTC).getTime(); // Ensure timestamp is in milliseconds
        const datetime = new Date(timestamp).toISOString(); // Add datetime field for chart engine
        const open = (price.openPrice.bid + price.openPrice.ask) / 2;
        const high = (price.highPrice.bid + price.highPrice.ask) / 2;
        const low = (price.lowPrice.bid + price.lowPrice.ask) / 2;
        const close = (price.closePrice.bid + price.closePrice.ask) / 2;

        // Debug logging for timestamp issues
        loggerService.debug(`Processing price data: snapshotTimeUTC=${price.snapshotTimeUTC}, timestamp=${timestamp}, datetime=${datetime}`);

        return {
          timestamp,
          datetime,
          open,
          high,
          low,
          close,
          volume: price.lastTradedVolume || 0,
        };
      });

      loggerService.info(`✅ Successfully fetched ${historicalData.length} price points for ${symbol} (epic: ${epic})`);
      return historicalData;
    } catch (error: any) {
      loggerService.error(`❌ Error fetching historical data for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get timeframe in milliseconds
   */
  private getTimeframeMilliseconds(timeframe: string): number {
    switch (timeframe.toUpperCase()) {
      case "M1":
      case "MINUTE":
        return 60 * 1000;
      case "M5":
      case "MINUTE_5":
        return 5 * 60 * 1000;
      case "M15":
      case "MINUTE_15":
        return 15 * 60 * 1000;
      case "M30":
      case "MINUTE_30":
        return 30 * 60 * 1000;
      case "H1":
      case "HOUR":
        return 60 * 60 * 1000;
      case "H4":
      case "HOUR_4":
        return 4 * 60 * 60 * 1000;
      case "D1":
      case "DAY":
        return 24 * 60 * 60 * 1000;
      default:
        return 60 * 1000; // Default to 1 minute
    }
  }

  /**
   * Map timeframe to Capital.com resolution
   *
   * @param timeframe Timeframe string
   * @returns Capital.com resolution string
   */
  private mapTimeframeToResolution(timeframe: string): string {
    const map: Record<string, string> = {
      // Legacy format
      "1m": "MINUTE",
      "5m": "MINUTE_5",
      "15m": "MINUTE_15",
      "30m": "MINUTE_30",
      "1h": "HOUR",
      "4h": "HOUR_4",
      "1d": "DAY",
      "1w": "WEEK",
      // Capital.com format
      M1: "MINUTE",
      M5: "MINUTE_5",
      M15: "MINUTE_15",
      M30: "MINUTE_30",
      H1: "HOUR",
      H4: "HOUR_4",
      D1: "DAY",
      W1: "WEEK",
    };

    return map[timeframe] || "MINUTE";
  }

  /**
   * Calculate appropriate number of candles based on timeframe
   *
   * @param timeframe Timeframe string
   * @returns Number of candles to fetch
   */
  private calculateCandleCount(timeframe: string): number {
    const upperTimeframe = timeframe.toUpperCase();

    // Smart candle counts that balance analysis needs with Capital.com API constraints
    // Higher candle counts for shorter timeframes where we can get more data
    switch (upperTimeframe) {
      case "M1":
      case "MINUTE":
        return 360; // 6 hours of M1 data - maximum within 6hr limit
      case "M5":
      case "MINUTE_5":
        return 72; // 6 hours of M5 data - maximum within 6hr limit
      case "M15":
      case "MINUTE_15":
        return 24; // 6 hours of M15 data - maximum within 6hr limit
      case "M30":
      case "MINUTE_30":
        return 12; // 6 hours of M30 data - maximum within 6hr limit
      case "H1":
      case "HOUR":
        return 6; // 6 hours of H1 data - maximum within 6hr limit
      case "H4":
      case "HOUR_4":
        return 2; // 8 hours of H4 data - just over 6hr limit but minimal
      case "D1":
      case "DAY":
      case "DAILY":
        return 1; // 1 day of daily data - within 6hr limit
      default:
        return 6; // Default to 6 hours of data
    }
  }

  /**
   * Render a chart using the chart engine
   *
   * @param options Chart options
   * @param data Historical data
   * @param skipLocalStorage Optional flag to skip local file storage
   * @returns Chart result with URL
   */
  private async renderChartWithEngine(options: ChartOptions, data: HistoricalDataPoint[], skipLocalStorage: boolean = false): Promise<ChartResult> {
    try {
      const chartApiUrl = this.activeChartUrl;

      // If chart engine URL is empty or null, fail immediately
      if (!chartApiUrl) {
        throw new Error("Chart engine service is not available");
      }

      // Ensure output directory exists if storing locally
      if (!skipLocalStorage) {
        await ensureOutputDirectory(this.outputDir);
      }

      loggerService.info(`Rendering chart with engine at ${chartApiUrl}`);

      // Process indicators to the format expected by the chart engine
      const indicators = this.processIndicators(options);

      loggerService.info(`Sending ${indicators ? Object.keys(indicators).length : 0} indicators to chart engine`);

      // Prepare the request payload for the chart engine
      const payload = {
        data: data,
        width: options.width || 1200,
        height: options.height || 800,
        theme: options.theme || "dark",
        symbol: options.symbol,
        timeframe: options.timeframe,
        show_volume: options.showVolume ?? true,
        indicators: indicators || {},
      };

      // Send request to chart engine
      const response = await axios.post(`${chartApiUrl}/generate-chart`, payload, {
        timeout: 60000, // 30 second timeout
        headers: {
          "Content-Type": "application/json",
        },
        // Handle both binary and JSON responses
        responseType: "arraybuffer",
      });

      loggerService.info(`Received response with content type: ${response.headers["content-type"]}`);

      let imageBuffer: Buffer | undefined;
      let extractedImage = false;

      // Handle JSON response with embedded image data
      const contentType = response.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        try {
          loggerService.info("Detected JSON response with embedded image data");
          const responseStr = Buffer.from(response.data).toString("utf8");
          const jsonData = JSON.parse(responseStr);

          // Try to find chart_image field (direct base64)
          if (jsonData.chart_image) {
            loggerService.info("Found direct chart_image field");
            imageBuffer = Buffer.from(jsonData.chart_image, "base64");
            extractedImage = true;
          }
          // Try to find image field (may also be base64)
          else if (jsonData.image) {
            loggerService.info("Found image field");
            imageBuffer = Buffer.from(jsonData.image, "base64");
            extractedImage = true;
          }
          // Try to find chart_data.image
          else if (jsonData.chart_data && jsonData.chart_data.image) {
            loggerService.info("Found chart_data.image field");
            imageBuffer = Buffer.from(jsonData.chart_data.image, "base64");
            extractedImage = true;
          }
          // Try to find data field with base64
          else if (jsonData.data) {
            loggerService.info("Found data field, checking for base64 content");
            // Check if data contains base64 string
            if (typeof jsonData.data === "string" && jsonData.data.length > 100) {
              const match = jsonData.data.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/);
              if (match) {
                loggerService.info("Found base64 data in data field");
                imageBuffer = Buffer.from(jsonData.data, "base64");
                extractedImage = true;
              }
            }
          }

          // If we still don't have an image, search for any base64-like content in the response
          if (!extractedImage) {
            // Look for base64 patterns in the response
            const base64UrlPattern = /data:image\/[^;]+;base64,([^"']+)/;
            let match = responseStr.match(base64UrlPattern);

            if (match && match[1]) {
              loggerService.info("Found base64 image data URL");
              imageBuffer = Buffer.from(match[1], "base64");
              extractedImage = true;
            } else {
              // Look for standalone base64 strings (look for long strings that look like base64)
              const standaloneBase64Pattern = /"([A-Za-z0-9+/]{500,}={0,2})"/;
              match = responseStr.match(standaloneBase64Pattern);

              if (match && match[1]) {
                loggerService.info("Found standalone base64 string");
                imageBuffer = Buffer.from(match[0], "base64");
                extractedImage = true;
              }
            }
          }

          // If we still don't have an image, look for any base64 data
          if (!extractedImage) {
            // Look for any base64-like string (long string of base64 characters)
            const base64Pattern = /[a-zA-Z0-9+/=]{100,}/;
            const match = responseStr.match(base64Pattern);

            if (match && match[0]) {
              loggerService.info("Found potential image data using generic pattern");
              imageBuffer = Buffer.from(match[0], "base64");
              extractedImage = true;
            }
          }
        } catch (jsonError) {
          loggerService.warn(`Failed to parse JSON response: ${jsonError instanceof Error ? jsonError.message : "Unknown error"}`);
        }
      } else if (contentType && contentType.includes("image")) {
        // Direct image response
        loggerService.info("Detected direct image response");
        imageBuffer = Buffer.from(response.data);
        extractedImage = true;
      }

      // If we still don't have an image, use the raw response as a last resort
      if (!extractedImage) {
        loggerService.warn("Could not extract image using any method, using raw response data");
        imageBuffer = Buffer.from(response.data);
      }

      // Validate the image buffer
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error("Received empty image buffer from chart engine");
      }

      // Validate PNG signature
      const isPngValid =
        imageBuffer.length >= 8 &&
        imageBuffer[0] === 137 &&
        imageBuffer[1] === 80 &&
        imageBuffer[2] === 78 &&
        imageBuffer[3] === 71 &&
        imageBuffer[4] === 13 &&
        imageBuffer[5] === 10 &&
        imageBuffer[6] === 26 &&
        imageBuffer[7] === 10;

      if (!isPngValid) {
        loggerService.warn("Chart engine returned image data without a valid PNG signature");
      } else {
        loggerService.info(`Valid PNG image buffer received (${imageBuffer.length} bytes)`);
      }

      const filename = generateChartFilename(options.symbol, options.timeframe);
      const outputPath = path.join(this.outputDir, filename);

      // Only save to local file if not skipping local storage
      if (!skipLocalStorage) {
        await fs.writeFile(outputPath, imageBuffer);
        loggerService.info(`Chart saved to ${outputPath}`);
      } else {
        loggerService.info(`Skipping local file storage as requested`);
      }

      return {
        chartUrl: `file://${outputPath}`,
        imageBuffer,
        generatedAt: new Date(),
        isFallback: false,
      };
    } catch (error) {
      // Enhanced error logging for 422 responses
      if (error instanceof AxiosError && error.response?.status === 422) {
        try {
          const errorResponseStr = Buffer.from(error.response.data).toString("utf8");
          const errorData = JSON.parse(errorResponseStr);
          loggerService.error(`Chart engine returned 422 error: ${JSON.stringify(errorData, null, 2)}`);
        } catch (parseError) {
          loggerService.error(`Chart engine returned 422 error but couldn't parse response: ${error.response.data}`);
        }
      }

      loggerService.error(`Error rendering chart with engine: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Process indicators to ensure proper format and add ATR if requested
   *
   * @param options Chart options containing indicator settings
   * @returns Processed indicators object ready for the chart engine
   */
  private processIndicators(options: ChartOptions): Record<string, any> {
    // Start with existing indicators or empty object
    let indicators: Record<string, any> = {};

    // Convert string array format to object format if needed
    if (Array.isArray(options.indicators)) {
      // Handle array of indicators (could be strings or objects)
      options.indicators.forEach((indicator: any) => {
        // Handle object indicators with type and params structure
        if (typeof indicator === "object" && indicator !== null && indicator.type) {
          const indicatorType = indicator.type.toLowerCase();

          // If indicator has params property, merge them
          if (indicator.params && typeof indicator.params === "object") {
            indicators[indicatorType] = { ...indicator.params };
          } else {
            // Otherwise, copy all properties except type
            const { type, ...params } = indicator;
            indicators[indicatorType] = params;
          }

          loggerService.info(`Added ${indicatorType} indicator with parameters:`, indicators[indicatorType]);
        }
        // Handle string indicators
        else if (typeof indicator === "string") {
          indicators[indicator.toLowerCase()] = {};
        } else {
          loggerService.warn(`Skipping invalid indicator: ${JSON.stringify(indicator)}`);
        }
      });
    } else if (options.indicators && typeof options.indicators === "object") {
      // Use existing object format but normalize keys to lowercase
      const indicatorObj = options.indicators as Record<string, IndicatorSettings>;
      Object.keys(indicatorObj).forEach((key) => {
        // Ensure key is a string before calling toLowerCase
        if (typeof key === "string") {
          const normalizedKey = key.toLowerCase();
          indicators[normalizedKey] = { ...indicatorObj[key] };
        } else {
          loggerService.warn(`Skipping non-string indicator key: ${JSON.stringify(key)}`);
        }
      });
    }

    // Add ATR indicator if atrSettings are provided or if not explicitly disabled
    if (options.atrSettings || (options.atrSettings !== null && options.atrSettings !== undefined)) {
      // Add ATR with custom settings or defaults
      indicators["atr"] = {
        period: options.atrSettings?.period || 14,
        color: options.atrSettings?.color || "brown",
      };
      loggerService.info("Added ATR indicator to chart");
    }

    // Add MACD if macdSettings are provided
    if (options.macdSettings) {
      indicators["macd"] = {
        fast: options.macdSettings.fastPeriod || 12,
        slow: options.macdSettings.slowPeriod || 26,
        signal: options.macdSettings.signalPeriod || 9,
      };
      loggerService.info("Added MACD indicator to chart");
    }

    // Format all indicators to ensure they have the right parameter names
    // This maps our frontend parameter names to what the Python chart engine expects
    Object.keys(indicators).forEach((key) => {
      const indicator = indicators[key];

      // Map common parameter name variations
      if (indicator.window && !indicator.period) {
        indicator.period = indicator.window;
      }

      if (indicator.fastPeriod && !indicator.fast) {
        indicator.fast = indicator.fastPeriod;
      }

      if (indicator.slowPeriod && !indicator.slow) {
        indicator.slow = indicator.slowPeriod;
      }

      if (indicator.signalPeriod && !indicator.signal) {
        indicator.signal = indicator.signalPeriod;
      }

      // Ensure indicator type is set (key is already lowercase at this point)
      if (!indicator.type) {
        indicator.type = key;
      }
    });

    loggerService.info(`Processed indicators for chart engine: ${Object.keys(indicators).join(", ")}`);
    loggerService.debug(`Sending ${Object.keys(indicators).length} indicators to chart engine`);
    return indicators;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Terminate fallback server if running
    if (this.fallbackServerProcess) {
      loggerService.info("Terminating fallback chart server");

      try {
        // On Windows, spawn a detached process to kill the process tree
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", this.fallbackServerProcess.pid.toString(), "/f", "/t"], {
            detached: true,
            stdio: "ignore",
          });
        } else {
          // On Unix, terminate the process group
          process.kill(-this.fallbackServerProcess.pid, "SIGTERM");
        }
      } catch (error) {
        loggerService.error(`Error terminating fallback server: ${error instanceof Error ? error.message : "Unknown error"}`);
      }

      this.fallbackServerProcess = null;
    }
  }
}

// Export singleton instance
export const chartEngineService = new ChartEngineService();
