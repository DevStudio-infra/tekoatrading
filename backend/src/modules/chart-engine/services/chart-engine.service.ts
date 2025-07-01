import { promises as fs } from "fs";
import * as path from "path";
import axios, { AxiosError } from "axios";
import { spawn } from "child_process";
import http from "http";
import dotenv from "dotenv";
import { getCapitalApiInstance } from "../../capital";
import type { CapitalAuthConfig } from "../../capital";
import { logger } from "../../../logger";
import {
  ChartOptions,
  HistoricalDataPoint,
  ChartResult,
  IndicatorSettings,
} from "../interfaces/chart-options.interface";
import {
  ensureOutputDirectory,
  generateChartFilename,
  calculateDateRange,
  generateAsciiChart,
} from "../utils/chart-utils";
import { prisma } from "../../../prisma";

// Load environment variables
dotenv.config();

/**
 * Service for generating and managing trading charts
 */
export class ChartEngineService {
  private readonly outputDir: string;
  private frontendPorts: number[] = [5001, 8001, 3000, 3001, 5173, 5174, 8080]; // Common chart engine ports to check
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
      logger.error(
        `Failed to initialize chart engine service: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Attempt to discover an active chart engine on common ports
   */
  private async discoverChartEngine(): Promise<void> {
    logger.info("Discovering chart engine...");

    // Check if CHART_ENGINE_URL is set in environment
    if (process.env.CHART_ENGINE_URL) {
      this.activeChartUrl = process.env.CHART_ENGINE_URL;
      logger.info(`Using configured chart engine URL: ${this.activeChartUrl}`);
      return;
    }

    // Try to discover on common ports
    for (const port of this.frontendPorts) {
      const url = `http://localhost:${port}`;
      try {
        const response = await axios.get(`${url}/chart-status`, { timeout: 500 });
        if (response.status === 200 && response.data?.status === "ready") {
          this.activeChartUrl = url;
          logger.info(`Discovered chart engine at ${url}`);
          return;
        }
      } catch (error) {
        // Ignore errors, just try next port
      }
    }

    logger.warn("No active chart engine discovered, will use fallback chart engine");

    try {
      // Try to start fallback chart engine
      await this.startFallbackChartServer();
      this.activeChartUrl = "http://localhost:5001";
      logger.info(`Started fallback chart engine at ${this.activeChartUrl}`);
    } catch (fallbackError) {
      logger.error(
        `Failed to start fallback chart engine: ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`,
      );
      this.activeChartUrl = null;
    }
  }

  /**
   * Start a fallback chart rendering server
   */
  private async startFallbackChartServer(): Promise<void> {
    logger.info("Starting fallback chart rendering server...");

    try {
      // Define the fallback server port
      const fallbackPort = 5001;

      // Path to the Python chart renderer script
      const rendererPath = path.join(process.cwd(), "chart-engine", "main.py");

      // Check if the renderer script exists
      try {
        await fs.access(rendererPath);
      } catch (error) {
        logger.error(`Python chart renderer not found at ${rendererPath}`);
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
        logger.debug(`Chart engine output: ${data.toString().trim()}`);
      });

      this.fallbackServerProcess.stderr.on("data", (data: Buffer) => {
        logger.error(`Chart engine error: ${data.toString().trim()}`);
      });

      // Handle process exit
      this.fallbackServerProcess.on("close", (code: number) => {
        logger.warn(`Chart engine process exited with code ${code}`);
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
      logger.error(
        `Error starting fallback chart server: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Generate a chart based on the provided options
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

    logger.info(
      `Generating chart for ${chartOptions.symbol}, timeframe: ${chartOptions.timeframe}`,
    );

    // Add timeout wrapper to prevent hanging
    const CHART_GENERATION_TIMEOUT = 120000; // 2 minutes timeout

    return Promise.race([
      this.generateChartInternal(chartOptions),
      new Promise<ChartResult>((_, reject) =>
        setTimeout(() => reject(new Error("Chart generation timeout")), CHART_GENERATION_TIMEOUT),
      ),
    ]);
  }

  /**
   * Internal chart generation logic
   */
  private async generateChartInternal(options: ChartOptions): Promise<ChartResult> {
    try {
      // Fetch historical data
      const data = await this.fetchHistoricalData(options.symbol, options.timeframe);

      if (!data || data.length === 0) {
        throw new Error(`No historical data available for ${options.symbol}`);
      }

      logger.info(`Fetched ${data.length} historical data points for ${options.symbol}`);

      // Render chart with engine (skip local storage, only use Supabase)
      return await this.renderChartWithEngine(options, data, true);
    } catch (error) {
      logger.error(
        `Error in chart generation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Fetch historical data for the symbol
   */
  private async fetchHistoricalData(
    symbol: string,
    timeframe: string,
  ): Promise<HistoricalDataPoint[]> {
    try {
      logger.info(`Fetching historical data for ${symbol} (${timeframe})`);

      // Get the first active broker credential for market data
      const brokerCredential = await prisma.brokerCredential.findFirst({
        where: { isActive: true },
      });

      if (!brokerCredential) {
        throw new Error("No active broker credentials found for market data");
      }

      // Use the same data fetching logic as the original chart service
      return await this.performHistoricalDataFetch(symbol, timeframe);
    } catch (error) {
      logger.error(
        `Error fetching historical data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Perform the actual historical data fetch using Capital API
   */
  private async performHistoricalDataFetch(
    symbol: string,
    timeframe: string,
  ): Promise<HistoricalDataPoint[]> {
    // Use existing Capital API integration
    const { credentialsEncryption } = await import(
      "../../../services/credentials-encryption.service"
    );

    const brokerCredential = await prisma.brokerCredential.findFirst({
      where: { isActive: true },
    });

    if (!brokerCredential) {
      throw new Error("No broker credentials available");
    }

    const credentialsData = credentialsEncryption.decryptCredentials(brokerCredential.credentials);
    const capitalApi = await getCapitalApiInstance(credentialsData as CapitalAuthConfig);

    // Convert symbol format
    const epic = await this.convertSymbolToEpic(symbol);
    const resolution = this.mapTimeframeToResolution(timeframe);
    const candleCount = this.calculateCandleCount(timeframe);

    logger.info(`Fetching ${candleCount} bars of ${timeframe} data for ${epic}`);

    const response = await capitalApi.getHistoricalPrices(epic, resolution, candleCount);

    if (!response || response.length === 0) {
      throw new Error(`No price data returned for ${symbol}`);
    }

    // Convert to HistoricalDataPoint format
    const historicalData: HistoricalDataPoint[] = response.map((price: any) => ({
      datetime: price.snapshotTimeUTC,
      open: (price.openPrice.bid + price.openPrice.ask) / 2,
      high: (price.highPrice.bid + price.highPrice.ask) / 2,
      low: (price.lowPrice.bid + price.lowPrice.ask) / 2,
      close: (price.closePrice.bid + price.closePrice.ask) / 2,
      volume: price.lastTradedVolume || 1000,
    }));

    logger.info(`Successfully fetched ${historicalData.length} price points for ${symbol}`);
    return historicalData;
  }

  /**
   * Render chart using the chart engine
   */
  private async renderChartWithEngine(
    options: ChartOptions,
    data: HistoricalDataPoint[],
    skipLocalStorage: boolean = false,
  ): Promise<ChartResult> {
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

      logger.info(`Rendering chart with engine at ${chartApiUrl}`);

      // Process indicators to the format expected by the chart engine
      const indicators = this.processIndicators(options);

      logger.info(
        `Sending ${indicators ? Object.keys(indicators).length : 0} indicators to chart engine`,
      );

      // Prepare the request payload for the chart engine
      const payload = {
        data: data,
        width: options.width || 1200,
        height: options.height || 800,
        chart_type: "candle",
        theme: options.theme || "dark",
        show_volume: options.showVolume ?? true,
        indicators: indicators || {},
      };

      // Send request to chart engine
      const response = await axios.post(`${chartApiUrl}/generate-chart`, payload, {
        timeout: 60000, // 60 second timeout
        headers: {
          "Content-Type": "application/json",
        },
        // Handle both binary and JSON responses
        responseType: "arraybuffer",
      });

      logger.info(`Received response with content type: ${response.headers["content-type"]}`);

      let imageBuffer: Buffer | undefined;
      let extractedImage = false;

      // Handle JSON response with embedded image data
      const contentType = response.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        try {
          logger.info("Detected JSON response with embedded image data");
          const responseStr = Buffer.from(response.data).toString("utf8");
          const jsonData = JSON.parse(responseStr);

          // Try to find chart_image field (direct base64)
          if (jsonData.chart_image) {
            logger.info("Found direct chart_image field");
            imageBuffer = Buffer.from(jsonData.chart_image, "base64");
            extractedImage = true;
          }
          // Try to find image field (may also be base64)
          else if (jsonData.image) {
            logger.info("Found image field");
            imageBuffer = Buffer.from(jsonData.image, "base64");
            extractedImage = true;
          }
        } catch (jsonError) {
          logger.warn(
            `Failed to parse JSON response: ${jsonError instanceof Error ? jsonError.message : "Unknown error"}`,
          );
        }
      } else if (contentType && contentType.includes("image")) {
        // Direct image response
        logger.info("Detected direct image response");
        imageBuffer = Buffer.from(response.data);
        extractedImage = true;
      }

      // If we still don't have an image, use the raw response as a last resort
      if (!extractedImage) {
        logger.warn("Could not extract image using any method, using raw response data");
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
        logger.warn("Chart engine returned image data without a valid PNG signature");
      } else {
        logger.info(`Valid PNG image buffer received (${imageBuffer.length} bytes)`);
      }

      const filename = generateChartFilename(options.symbol, options.timeframe);
      const outputPath = path.join(this.outputDir, filename);

      let chartUrl: string;

      // Only save to local file if not skipping local storage
      if (!skipLocalStorage) {
        await fs.writeFile(outputPath, imageBuffer);
        logger.info(`Chart saved to ${outputPath}`);
        chartUrl = `file://${outputPath}`;
      } else {
        logger.info(`Skipping local file storage - uploading to Supabase instead`);

        try {
          // Import Supabase storage service
          const { supabaseStorageService } = await import(
            "../../../services/supabase-storage.service"
          );

          // Generate Supabase filename
          const supabaseFileName = `charts/${filename}`;

          // Upload to Supabase
          const supabaseUrl = await supabaseStorageService.uploadBase64Image(
            imageBuffer.toString("base64"),
            supabaseFileName,
            options.botId ? `bot-${options.botId}` : "system",
          );

          if (supabaseUrl) {
            chartUrl = supabaseUrl;
            logger.info(`✅ Chart uploaded to Supabase: ${chartUrl}`);
          } else {
            logger.warn("⚠️ Supabase upload failed, using temporary URL as fallback");
            chartUrl = `temp://chart-${Date.now()}-${filename}`;
          }
        } catch (supabaseError) {
          logger.error("❌ Supabase upload error:", supabaseError);
          chartUrl = `temp://chart-${Date.now()}-${filename}`;
        }
      }

      return {
        chartUrl,
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
          logger.error(`Chart engine returned 422 error: ${JSON.stringify(errorData, null, 2)}`);
        } catch (parseError) {
          logger.error(
            `Chart engine returned 422 error but couldn't parse response: ${error.response.data}`,
          );
        }
      }

      logger.error(
        `Error rendering chart with engine: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Process indicators to ensure proper format
   */
  private processIndicators(options: ChartOptions): Record<string, any> {
    if (!options.indicators) {
      return {};
    }

    const processed: Record<string, any> = {};

    for (const [name, settings] of Object.entries(options.indicators)) {
      if (settings.enabled) {
        processed[name] = {
          period: settings.period || 20,
          color: settings.color || "blue",
          ...settings,
        };
      }
    }

    return processed;
  }

  // Helper methods (copied from original service)
  private convertSymbolToEpic(symbol: string): string {
    const symbolMappings: { [key: string]: string } = {
      "BTC/USD": "BTCUSD",
      "ETH/USD": "ETHUSD",
      "EUR/USD": "CS.D.EURUSD.MINI.IP",
      "GBP/USD": "CS.D.GBPUSD.MINI.IP",
      // Add more mappings as needed
    };

    return symbolMappings[symbol.toUpperCase()] || symbol;
  }

  private mapTimeframeToResolution(
    timeframe: string,
  ): "MINUTE" | "MINUTE_5" | "MINUTE_15" | "MINUTE_30" | "HOUR" | "HOUR_4" | "DAY" | "WEEK" {
    const timeframeMap: { [key: string]: any } = {
      M1: "MINUTE",
      M5: "MINUTE_5",
      M15: "MINUTE_15",
      M30: "MINUTE_30",
      H1: "HOUR",
      H4: "HOUR_4",
      D1: "DAY",
      W1: "WEEK",
    };

    return timeframeMap[timeframe.toUpperCase()] || "HOUR";
  }

  private calculateCandleCount(timeframe: string): number {
    const candleCountMap: { [key: string]: number } = {
      M1: 400,
      M5: 300,
      M15: 200,
      M30: 150,
      H1: 100,
      H4: 50,
      D1: 30,
      W1: 20,
    };

    return candleCountMap[timeframe.toUpperCase()] || 100;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.fallbackServerProcess) {
      logger.info("Stopping fallback chart server...");
      this.fallbackServerProcess.kill();
      this.fallbackServerProcess = null;
    }
  }
}
