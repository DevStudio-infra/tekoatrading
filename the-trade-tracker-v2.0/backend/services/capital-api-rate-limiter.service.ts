/**
 * Capital.com API Rate Limiter
 * Manages API request queuing and rate limiting to prevent 429 errors
 */

import { loggerService } from "./logger.service";

interface QueuedRequest {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: "high" | "normal" | "low";
  timestamp: number;
  endpoint: string;
}

export class CapitalApiRateLimiter {
  private static instance: CapitalApiRateLimiter;
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private requestCount = 0;
  private windowStart = Date.now();

  // ULTRA-ULTRA-conservative rate limiting for multiple concurrent bots
  private readonly MIN_INTERVAL = 90000; // 90 seconds between requests (was 60s)
  private readonly MAX_REQUESTS_PER_MINUTE = 1; // Still 1 request per minute
  private readonly BURST_DELAY = 45 * 60 * 1000; // 45 minutes after rate limit hit (was 30min)
  private readonly MAX_QUEUE_SIZE = 1; // Max 1 request in queue - ultra restrictive
  private readonly MAX_REQUESTS_PER_HOUR = 5; // 5 requests per hour (was 10) - extremely reduced

  private rateLimitHitCount = 0;
  private lastRateLimitTime = 0;

  // Track failed requests to implement exponential backoff
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;

  static getInstance(): CapitalApiRateLimiter {
    if (!CapitalApiRateLimiter.instance) {
      CapitalApiRateLimiter.instance = new CapitalApiRateLimiter();
    }
    return CapitalApiRateLimiter.instance;
  }

  async addToQueue<T>(requestFn: () => Promise<T>, endpoint: string = "unknown", priority: "high" | "normal" | "low" = "normal"): Promise<T> {
    return new Promise((resolve, reject) => {
      // Check queue size
      if (this.queue.length >= this.MAX_QUEUE_SIZE) {
        loggerService.warn(`[RATE LIMITER] Queue full (${this.queue.length}/${this.MAX_QUEUE_SIZE}), rejecting ${endpoint}`);
        reject(new Error(`Rate limiter queue is full. Current queue: ${this.queue.length}/${this.MAX_QUEUE_SIZE}. Try again later.`));
        return;
      }

      // Check if we're over hourly limit immediately
      if (this.rateLimitHitCount >= this.MAX_REQUESTS_PER_HOUR) {
        const timeUntilHourlyReset = 3600000 - (Date.now() - this.lastRateLimitTime);
        if (timeUntilHourlyReset > 0) {
          loggerService.warn(`[RATE LIMITER] Hourly limit reached (${this.rateLimitHitCount}/${this.MAX_REQUESTS_PER_HOUR}), rejecting ${endpoint}`);
          reject(new Error(`Hourly API limit reached. Wait ${Math.ceil(timeUntilHourlyReset / 60000)} minutes.`));
          return;
        }
      }

      this.queue.push({
        execute: requestFn,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
        endpoint,
      });

      // Sort queue by priority (high -> normal -> low) and timestamp
      this.queue.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return a.timestamp - b.timestamp;
      });

      loggerService.debug(`[RATE LIMITER] Added ${endpoint} to queue (${this.queue.length}/${this.MAX_QUEUE_SIZE})`);
      this.processQueue();
    });
  }

  async addToQueueWithTimeout<T>(requestFn: () => Promise<T>, timeoutMs: number = 45000, endpoint: string = "unknown", priority: "high" | "normal" | "low" = "normal"): Promise<T> {
    return Promise.race([
      this.addToQueue(requestFn, endpoint, priority),
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms for ${endpoint}`)), timeoutMs)),
    ]);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;

      try {
        // Check if we need to wait
        await this.waitIfNeeded();

        // Execute the request
        const startTime = Date.now();
        loggerService.info(`[RATE LIMITER] Executing ${request.endpoint} request (queue: ${this.queue.length} remaining)`);

        const result = await request.execute();

        const duration = Date.now() - startTime;
        loggerService.info(`[RATE LIMITER] ${request.endpoint} completed in ${duration}ms`);

        // Update counters
        this.lastRequestTime = Date.now();
        this.requestCount++;
        this.rateLimitHitCount++;

        // Reset minute counter if needed
        if (Date.now() - this.windowStart > 60000) {
          this.requestCount = 0;
          this.windowStart = Date.now();
        }

        // Reset hourly counter if needed
        if (Date.now() - this.lastRateLimitTime > 3600000) {
          this.rateLimitHitCount = 0;
          this.lastRateLimitTime = Date.now();
        }

        request.resolve(result);
      } catch (error) {
        loggerService.error(`[RATE LIMITER] Request failed for ${request.endpoint}:`, error);

        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          loggerService.warn(`[RATE LIMITER] Rate limit hit for ${request.endpoint}, pausing for ${this.BURST_DELAY}ms`);

          // Clear the entire queue to prevent further rate limiting
          const clearedCount = this.queue.length;
          this.queue.forEach((queuedRequest) => {
            queuedRequest.reject(new Error(`Queue cleared due to rate limit. Original endpoint: ${queuedRequest.endpoint}`));
          });
          this.queue = [];

          if (clearedCount > 0) {
            loggerService.warn(`[RATE LIMITER] Cleared ${clearedCount} queued requests due to rate limit`);
          }

          // Reject the current request
          request.reject(new Error(`Rate limit hit for ${request.endpoint}. Queue cleared. Wait ${Math.ceil(this.BURST_DELAY / 60000)} minutes.`));

          // Wait before allowing new requests
          await this.delay(this.BURST_DELAY);
          break;
        }

        request.reject(error);
      }
    }

    this.isProcessing = false;
  }

  private async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Check hourly limit
    if (this.rateLimitHitCount >= this.MAX_REQUESTS_PER_HOUR) {
      const timeUntilHourlyReset = 3600000 - (now - this.lastRateLimitTime);
      if (timeUntilHourlyReset > 0) {
        loggerService.warn(`[RATE LIMITER] Hourly limit reached, waiting ${timeUntilHourlyReset}ms`);
        await this.delay(timeUntilHourlyReset);
        this.rateLimitHitCount = 0;
        this.lastRateLimitTime = Date.now();
      }
    }

    // Check minute limit
    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      const timeUntilMinuteReset = 60000 - (now - this.windowStart);
      if (timeUntilMinuteReset > 0) {
        loggerService.warn(`[RATE LIMITER] Minute limit reached, waiting ${timeUntilMinuteReset}ms`);
        await this.delay(timeUntilMinuteReset);
        this.requestCount = 0;
        this.windowStart = Date.now();
      }
    }

    // Ensure minimum interval between requests
    if (timeSinceLastRequest < this.MIN_INTERVAL) {
      const waitTime = this.MIN_INTERVAL - timeSinceLastRequest;
      loggerService.debug(`[RATE LIMITER] Waiting ${waitTime}ms for minimum interval`);
      await this.delay(waitTime);
    }
  }

  private isRateLimitError(error: any): boolean {
    return (
      error?.response?.status === 429 ||
      error?.status === 429 ||
      error?.code === "ERR_TOO_MANY_REQUESTS" ||
      (error?.message && error.message.includes("too many requests")) ||
      error?.response?.data?.errorCode === "error.too-many.requests"
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get current queue status
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      requestsThisMinute: this.requestCount,
      requestsThisHour: this.rateLimitHitCount,
      lastRequestTime: this.lastRequestTime,
      timeSinceLastRequest: Date.now() - this.lastRequestTime,
    };
  }

  // Clear the queue (for emergency situations)
  clearQueue() {
    const clearedCount = this.queue.length;
    this.queue.forEach((request) => {
      request.reject(new Error("Queue cleared by admin"));
    });
    this.queue = [];
    loggerService.warn(`[RATE LIMITER] Cleared ${clearedCount} requests from queue`);
  }
}

export const capitalApiRateLimiter = CapitalApiRateLimiter.getInstance();
