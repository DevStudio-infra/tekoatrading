/**
 * Logger Service for LangChain Agents
 * Provides centralized logging functionality
 */

export class LoggerService {
  private context: string = "AgentLogger";

  constructor(context?: string) {
    if (context) {
      this.context = context;
    }
  }

  log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.context}] ${message}`, data || "");
  }

  error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${this.context}] ERROR: ${message}`, error || "");
  }

  warn(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [${this.context}] WARNING: ${message}`, data || "");
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV !== "production") {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [${this.context}] DEBUG: ${message}`, data || "");
    }
  }

  info(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.info(`[${timestamp}] [${this.context}] INFO: ${message}`, data || "");
  }
}

export const loggerService = new LoggerService("GlobalLogger");
