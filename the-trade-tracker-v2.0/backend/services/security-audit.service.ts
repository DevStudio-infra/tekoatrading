import { Request } from "express";
import { loggerService } from "../agents/core/services/logging/logger.service";
import { prisma } from "../utils/prisma";

interface SecurityEvent {
  type: "auth_failure" | "rate_limit" | "validation_error" | "suspicious_activity" | "unauthorized_access";
  severity: "low" | "medium" | "high" | "critical";
  userId?: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  details: Record<string, any>;
  timestamp: Date;
}

interface ThreatDetectionResult {
  isThreat: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  reasons: string[];
  recommendedAction: "allow" | "warn" | "block" | "investigate";
}

class SecurityAuditService {
  private suspiciousIPs = new Set<string>();
  private failedAttempts = new Map<string, { count: number; lastAttempt: Date }>();
  private blockedIPs = new Set<string>();

  /**
   * Log a security event
   */
  async logSecurityEvent(event: Omit<SecurityEvent, "timestamp">): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };

    try {
      // Log to application logs
      loggerService.warn(`Security Event: ${event.type} | Severity: ${event.severity} | IP: ${event.ip} | Endpoint: ${event.endpoint}`, {
        securityEvent,
      });

      // Store in database for analysis
      await this.storeSecurityEvent(securityEvent);

      // Check for threat patterns
      const threatResult = await this.analyzeThreatPatterns(securityEvent);

      if (threatResult.isThreat) {
        await this.handleThreat(securityEvent, threatResult);
      }
    } catch (error) {
      loggerService.error("Failed to log security event:", error);
    }
  }

  /**
   * Store security event in database
   */
  private async storeSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Note: You may need to create a SecurityEvent table in your database
      // For now, we'll use the existing logging mechanism
      loggerService.info("Security event stored", { event });
    } catch (error) {
      loggerService.error("Failed to store security event:", error);
    }
  }

  /**
   * Analyze threat patterns
   */
  private async analyzeThreatPatterns(event: SecurityEvent): Promise<ThreatDetectionResult> {
    const reasons: string[] = [];
    let riskLevel: ThreatDetectionResult["riskLevel"] = "low";
    let recommendedAction: ThreatDetectionResult["recommendedAction"] = "allow";

    // Check for brute force attacks
    if (event.type === "auth_failure") {
      const key = `${event.ip}:auth`;
      const attempts = this.failedAttempts.get(key) || { count: 0, lastAttempt: new Date(0) };

      const timeDiff = Date.now() - attempts.lastAttempt.getTime();
      const isRecentAttempt = timeDiff < 15 * 60 * 1000; // 15 minutes

      if (isRecentAttempt) {
        attempts.count++;
      } else {
        attempts.count = 1;
      }

      attempts.lastAttempt = new Date();
      this.failedAttempts.set(key, attempts);

      if (attempts.count >= 5) {
        reasons.push("Multiple authentication failures detected");
        riskLevel = "high";
        recommendedAction = "block";
        this.blockedIPs.add(event.ip);
      } else if (attempts.count >= 3) {
        reasons.push("Repeated authentication failures");
        riskLevel = "medium";
        recommendedAction = "warn";
      }
    }

    // Check for suspicious user agents
    if (this.isSuspiciousUserAgent(event.userAgent)) {
      reasons.push("Suspicious user agent detected");
      riskLevel = riskLevel === "high" ? "high" : "medium";
      recommendedAction = "investigate";
    }

    // Check for SQL injection patterns
    if (this.containsSQLInjectionPatterns(event.details)) {
      reasons.push("Potential SQL injection attempt");
      riskLevel = "critical";
      recommendedAction = "block";
    }

    // Check for XSS patterns
    if (this.containsXSSPatterns(event.details)) {
      reasons.push("Potential XSS attempt");
      riskLevel = "high";
      recommendedAction = "block";
    }

    // Check for rapid requests from same IP
    if (event.type === "rate_limit") {
      reasons.push("Rate limit exceeded");
      riskLevel = "medium";
      recommendedAction = "warn";
      this.suspiciousIPs.add(event.ip);
    }

    // Check for access to sensitive endpoints without proper auth
    if (event.type === "unauthorized_access" && this.isSensitiveEndpoint(event.endpoint)) {
      reasons.push("Unauthorized access to sensitive endpoint");
      riskLevel = "high";
      recommendedAction = "investigate";
    }

    return {
      isThreat: reasons.length > 0,
      riskLevel,
      reasons,
      recommendedAction,
    };
  }

  /**
   * Handle detected threats
   */
  private async handleThreat(event: SecurityEvent, threat: ThreatDetectionResult): Promise<void> {
    loggerService.error(`THREAT DETECTED: ${threat.riskLevel.toUpperCase()} risk from ${event.ip}`, {
      event,
      threat,
    });

    // Auto-block critical threats
    if (threat.riskLevel === "critical" || threat.recommendedAction === "block") {
      this.blockedIPs.add(event.ip);
      loggerService.error(`IP ${event.ip} has been automatically blocked due to critical threat`);
    }

    // Send alerts for high-risk threats
    if (threat.riskLevel === "high" || threat.riskLevel === "critical") {
      await this.sendSecurityAlert(event, threat);
    }
  }

  /**
   * Send security alert
   */
  private async sendSecurityAlert(event: SecurityEvent, threat: ThreatDetectionResult): Promise<void> {
    // In a real implementation, you might send emails, Slack notifications, etc.
    loggerService.error("SECURITY ALERT", {
      message: `High-risk security event detected from IP ${event.ip}`,
      event,
      threat,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  /**
   * Check if IP is suspicious
   */
  isIPSuspicious(ip: string): boolean {
    return this.suspiciousIPs.has(ip);
  }

  /**
   * Unblock an IP address
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
    this.failedAttempts.delete(`${ip}:auth`);
    loggerService.info(`IP ${ip} has been unblocked`);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    blockedIPs: number;
    suspiciousIPs: number;
    recentFailedAttempts: number;
  } {
    // Count recent failed attempts (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentFailedAttempts = Array.from(this.failedAttempts.values())
      .filter((attempt) => attempt.lastAttempt.getTime() > oneHourAgo)
      .reduce((sum, attempt) => sum + attempt.count, 0);

    return {
      blockedIPs: this.blockedIPs.size,
      suspiciousIPs: this.suspiciousIPs.size,
      recentFailedAttempts,
    };
  }

  /**
   * Extract security context from request
   */
  extractSecurityContext(req: Request): {
    ip: string;
    userAgent: string;
    endpoint: string;
    method: string;
    userId?: string;
  } {
    return {
      ip: req.ip || req.connection.remoteAddress || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
      endpoint: req.originalUrl || req.url,
      method: req.method,
      userId: req.user?.userId?.toString(),
    };
  }

  /**
   * Check for suspicious user agents
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [/sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /nessus/i, /openvas/i, /burp/i, /zap/i, /curl.*bot/i, /wget.*bot/i];

    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * Check for SQL injection patterns
   */
  private containsSQLInjectionPatterns(data: any): boolean {
    const sqlPatterns = [
      /('|(\\')|(;)|(\|)|(\*)|(%27)|(%3D)|(sp_)|(\bxp_)|(\bdrop\b)|(\bdelete\b)|(\binsert\b)|(\bupdate\b)|(\bunion\b)|(\bselect\b)|(\bcreate\b)|(\balter\b)|(\bexec\b)|(\bexecute\b))/i,
      /(\b(or|and)\b\s*\d+\s*=\s*\d+)/i,
      /(\b(or|and)\b\s*['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i,
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    return sqlPatterns.some((pattern) => pattern.test(dataString));
  }

  /**
   * Check for XSS patterns
   */
  private containsXSSPatterns(data: any): boolean {
    const xssPatterns = [/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, /javascript:/gi, /on\w+\s*=/gi, /<iframe/gi, /<object/gi, /<embed/gi, /<link/gi, /<meta/gi];

    const dataString = JSON.stringify(data);
    return xssPatterns.some((pattern) => pattern.test(dataString));
  }

  /**
   * Check if endpoint is sensitive
   */
  private isSensitiveEndpoint(endpoint: string): boolean {
    const sensitivePatterns = [
      /\/api\/auth/,
      /\/api\/admin/,
      /\/api\/users/,
      /\/api\/broker-credentials/,
      /\/api\/analytics\/export/,
      /\/api\/bots\/\w+\/execute/,
      /\/api\/bots\/\w+\/trade/,
    ];

    return sensitivePatterns.some((pattern) => pattern.test(endpoint));
  }

  /**
   * Clean up old entries periodically
   */
  cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Clean up failed attempts older than 1 hour
    for (const [key, attempt] of this.failedAttempts.entries()) {
      if (attempt.lastAttempt.getTime() < oneHourAgo) {
        this.failedAttempts.delete(key);
      }
    }

    // Clean up suspicious IPs older than 1 day (you might want to persist these)
    // For now, we'll keep them in memory

    loggerService.debug("Security audit cleanup completed");
  }
}

// Create singleton instance
export const securityAuditService = new SecurityAuditService();

// Set up periodic cleanup
setInterval(() => {
  securityAuditService.cleanup();
}, 15 * 60 * 1000); // Every 15 minutes
