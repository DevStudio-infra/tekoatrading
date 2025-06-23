/**
 * Bot Credential Validator Service
 * Enforces limits on the number of bots per credential to prevent API overwhelm
 */

import { prisma } from "../utils/prisma";
import { loggerService } from "../agents/core/services/logging/logger.service";

interface BotLimitConfig {
  maxBotsPerCredential: number;
  warningThreshold: number;
  emergencyThreshold: number;
}

interface CredentialUsage {
  credentialId: string;
  credentialName: string;
  activeBots: number;
  totalBots: number;
  status: "optimal" | "warning" | "critical" | "blocked";
  recommendation: string;
}

export class BotCredentialValidatorService {
  private static instance: BotCredentialValidatorService;

  // Configurable limits
  private readonly DEFAULT_CONFIG: BotLimitConfig = {
    maxBotsPerCredential: 8, // Hard limit: 8 bots per credential
    warningThreshold: 5, // Warning at 5 bots
    emergencyThreshold: 7, // Emergency mode at 7 bots
  };

  static getInstance(): BotCredentialValidatorService {
    if (!BotCredentialValidatorService.instance) {
      BotCredentialValidatorService.instance = new BotCredentialValidatorService();
    }
    return BotCredentialValidatorService.instance;
  }

  /**
   * Validate if a new bot can be created with the specified credential
   */
  async validateBotCreation(
    credentialId: string,
    userId: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
    currentCount: number;
    maxAllowed: number;
    recommendation?: string;
  }> {
    try {
      // Get current bot count for this credential
      const currentBotCount = await this.getBotCountForCredential(credentialId, userId);
      const config = this.DEFAULT_CONFIG;

      // Check hard limit
      if (currentBotCount >= config.maxBotsPerCredential) {
        return {
          allowed: false,
          reason: `Maximum bot limit reached (${currentBotCount}/${config.maxBotsPerCredential}) for this credential.`,
          currentCount: currentBotCount,
          maxAllowed: config.maxBotsPerCredential,
          recommendation: "Use a different Capital.com credential or delete existing bots to create new ones.",
        };
      }

      // Check warning threshold
      if (currentBotCount >= config.warningThreshold) {
        return {
          allowed: true,
          reason: `Warning: Approaching bot limit (${currentBotCount}/${config.maxBotsPerCredential}) for this credential.`,
          currentCount: currentBotCount,
          maxAllowed: config.maxBotsPerCredential,
          recommendation: "Consider using additional Capital.com credentials for better performance.",
        };
      }

      // All good
      return {
        allowed: true,
        currentCount: currentBotCount,
        maxAllowed: config.maxBotsPerCredential,
      };
    } catch (error) {
      loggerService.error("Error validating bot creation:", error);
      return {
        allowed: false,
        reason: "Unable to validate bot creation due to system error.",
        currentCount: 0,
        maxAllowed: this.DEFAULT_CONFIG.maxBotsPerCredential,
      };
    }
  }

  /**
   * Get comprehensive credential usage analysis
   */
  async getCredentialUsageAnalysis(userId: string): Promise<CredentialUsage[]> {
    try {
      // Get all user's credentials with bot counts
      const credentials = await prisma.brokerCredential.findMany({
        where: {
          userId: userId,
          isActive: true,
        },
        include: {
          bots: {
            select: {
              id: true,
              isActive: true,
              isAiTradingActive: true,
            },
          },
        },
      });

      const config = this.DEFAULT_CONFIG;
      const analysis: CredentialUsage[] = [];

      for (const credential of credentials) {
        const totalBots = credential.bots.length;
        const activeBots = credential.bots.filter((bot) => bot.isActive && bot.isAiTradingActive).length;

        let status: "optimal" | "warning" | "critical" | "blocked";
        let recommendation: string;

        if (activeBots >= config.maxBotsPerCredential) {
          status = "blocked";
          recommendation = "BLOCKED: Cannot create more bots. Use different credentials or delete existing bots.";
        } else if (activeBots >= config.emergencyThreshold) {
          status = "critical";
          recommendation = "CRITICAL: System running in emergency mode. Performance severely degraded.";
        } else if (activeBots >= config.warningThreshold) {
          status = "warning";
          recommendation = "WARNING: Approaching limits. Consider using additional credentials.";
        } else {
          status = "optimal";
          recommendation = `OPTIMAL: Can add ${config.maxBotsPerCredential - activeBots} more bots with good performance.`;
        }

        analysis.push({
          credentialId: credential.id,
          credentialName: credential.name,
          activeBots,
          totalBots,
          status,
          recommendation,
        });
      }

      return analysis;
    } catch (error) {
      loggerService.error("Error getting credential usage analysis:", error);
      return [];
    }
  }

  /**
   * Get bot count for a specific credential
   */
  private async getBotCountForCredential(credentialId: string, userId: string): Promise<number> {
    const count = await prisma.bot.count({
      where: {
        brokerCredentialId: credentialId,
        userId: userId,
        isActive: true,
        isAiTradingActive: true,
      },
    });

    return count;
  }

  /**
   * Get system-wide bot distribution statistics
   */
  async getSystemBotDistribution(): Promise<{
    totalCredentials: number;
    totalBots: number;
    averageBotsPerCredential: number;
    credentialsAtLimit: number;
    credentialsInEmergency: number;
    recommendations: string[];
  }> {
    try {
      const credentials = await prisma.brokerCredential.findMany({
        where: { isActive: true },
        include: {
          bots: {
            where: {
              isActive: true,
              isAiTradingActive: true,
            },
          },
        },
      });

      const config = this.DEFAULT_CONFIG;
      let totalBots = 0;
      let credentialsAtLimit = 0;
      let credentialsInEmergency = 0;
      const recommendations: string[] = [];

      for (const credential of credentials) {
        const botCount = credential.bots.length;
        totalBots += botCount;

        if (botCount >= config.maxBotsPerCredential) {
          credentialsAtLimit++;
        } else if (botCount >= config.emergencyThreshold) {
          credentialsInEmergency++;
        }
      }

      const averageBotsPerCredential = credentials.length > 0 ? totalBots / credentials.length : 0;

      // Generate recommendations
      if (credentialsAtLimit > 0) {
        recommendations.push(`${credentialsAtLimit} credential(s) at maximum capacity. Users cannot create more bots.`);
      }
      if (credentialsInEmergency > 0) {
        recommendations.push(`${credentialsInEmergency} credential(s) in emergency mode. Performance degraded.`);
      }
      if (averageBotsPerCredential > config.warningThreshold) {
        recommendations.push("System approaching capacity. Encourage users to use multiple credentials.");
      }

      return {
        totalCredentials: credentials.length,
        totalBots,
        averageBotsPerCredential: Math.round(averageBotsPerCredential * 100) / 100,
        credentialsAtLimit,
        credentialsInEmergency,
        recommendations,
      };
    } catch (error) {
      loggerService.error("Error getting system bot distribution:", error);
      return {
        totalCredentials: 0,
        totalBots: 0,
        averageBotsPerCredential: 0,
        credentialsAtLimit: 0,
        credentialsInEmergency: 0,
        recommendations: ["Error retrieving system statistics."],
      };
    }
  }

  /**
   * Update bot limits configuration (for admin use)
   */
  updateLimits(newConfig: Partial<BotLimitConfig>): void {
    Object.assign(this.DEFAULT_CONFIG, newConfig);
    loggerService.info("Bot credential limits updated:", this.DEFAULT_CONFIG);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): BotLimitConfig {
    return { ...this.DEFAULT_CONFIG };
  }

  /**
   * Check if a credential is over capacity and suggest alternatives
   */
  async suggestAlternativeCredentials(
    userId: string,
    excludeCredentialId?: string
  ): Promise<{
    availableCredentials: Array<{
      id: string;
      name: string;
      currentBots: number;
      availableSlots: number;
    }>;
    needsNewCredential: boolean;
  }> {
    try {
      const credentials = await prisma.brokerCredential.findMany({
        where: {
          userId: userId,
          isActive: true,
          ...(excludeCredentialId && { id: { not: excludeCredentialId } }),
        },
        include: {
          bots: {
            where: {
              isActive: true,
              isAiTradingActive: true,
            },
          },
        },
      });

      const config = this.DEFAULT_CONFIG;
      const availableCredentials = credentials
        .filter((cred) => cred.bots.length < config.maxBotsPerCredential)
        .map((cred) => ({
          id: cred.id,
          name: cred.name,
          currentBots: cred.bots.length,
          availableSlots: config.maxBotsPerCredential - cred.bots.length,
        }))
        .sort((a, b) => b.availableSlots - a.availableSlots); // Sort by most available slots

      return {
        availableCredentials,
        needsNewCredential: availableCredentials.length === 0,
      };
    } catch (error) {
      loggerService.error("Error suggesting alternative credentials:", error);
      return {
        availableCredentials: [],
        needsNewCredential: true,
      };
    }
  }
}
