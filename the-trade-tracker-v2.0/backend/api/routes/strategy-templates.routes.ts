import { Router, Request, Response, NextFunction } from "express";
import { strategyTemplateService } from "../../services/strategy-template.service";
import { loggerService } from "../../services/logger.service";
// import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

/**
 * GET /api/strategy-templates
 * Get all strategy templates with optional filters
 */
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, complexity, marketCondition } = req.query;

    const filters = {
      category: category as string,
      complexity: complexity as string,
      marketCondition: marketCondition as string,
    };

    // Remove undefined values
    Object.keys(filters).forEach((key) => {
      if (!filters[key as keyof typeof filters]) {
        delete filters[key as keyof typeof filters];
      }
    });

    const templates = await strategyTemplateService.getAllTemplates(Object.keys(filters).length > 0 ? filters : undefined);

    res.json({
      success: true,
      data: templates,
      total: templates.length,
    });
  } catch (error) {
    loggerService.error("Error fetching strategy templates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch strategy templates",
    });
  }
});

/**
 * GET /api/strategy-templates/categories
 * Get strategy templates grouped by category
 */
router.get("/categories", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const grouped = await strategyTemplateService.getTemplatesByCategory();

    res.json({
      success: true,
      data: grouped,
    });
  } catch (error) {
    loggerService.error("Error fetching templates by category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch templates by category",
    });
  }
});

/**
 * GET /api/strategy-templates/search
 * Search strategy templates
 */
router.get("/search", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      res.status(400).json({
        success: false,
        error: "Search query is required",
      });
      return;
    }

    const templates = await strategyTemplateService.searchTemplates(q);

    res.json({
      success: true,
      data: templates,
      total: templates.length,
    });
  } catch (error) {
    loggerService.error("Error searching strategy templates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search strategy templates",
    });
  }
});

/**
 * GET /api/strategy-templates/stats
 * Get strategy template statistics
 */
router.get("/stats", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await strategyTemplateService.getTemplateStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    loggerService.error("Error fetching template stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch template stats",
    });
  }
});

/**
 * GET /api/strategy-templates/:id
 * Get specific strategy template by ID
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const template = await strategyTemplateService.getTemplateById(id);

    // Validate indicators
    const validation = strategyTemplateService.validateTemplateIndicators(template);

    res.json({
      success: true,
      data: {
        ...template,
        validation,
      },
    });
  } catch (error) {
    loggerService.error(`Error fetching strategy template ${req.params.id}:`, error);

    if (error instanceof Error && error.message === "Strategy template not found") {
      res.status(404).json({
        success: false,
        error: "Strategy template not found",
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to fetch strategy template",
      });
    }
  }
});

/**
 * POST /api/strategy-templates/:id/create-strategy
 * Create a user strategy from template
 */
router.post(
  "/:id/create-strategy",
  /* authenticate, */ async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      // For now, use a default user ID since authentication is disabled
      const userId = "f99c772b-aca6-4163-954d-e2fd3fece3aa"; // req.user?.id?.toString();

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User authentication required",
        });
        return;
      }

      const { name, description, minRiskPerTrade, maxRiskPerTrade, confidenceThreshold } = req.body;

      const customizations = {
        name,
        description,
        minRiskPerTrade: minRiskPerTrade ? parseFloat(minRiskPerTrade) : undefined,
        maxRiskPerTrade: maxRiskPerTrade ? parseFloat(maxRiskPerTrade) : undefined,
        confidenceThreshold: confidenceThreshold ? parseInt(confidenceThreshold.toString()) : undefined,
      };

      // Remove undefined values
      Object.keys(customizations).forEach((key) => {
        if (customizations[key as keyof typeof customizations] === undefined) {
          delete customizations[key as keyof typeof customizations];
        }
      });

      const strategy = await strategyTemplateService.createStrategyFromTemplate(id, userId, Object.keys(customizations).length > 0 ? customizations : undefined);

      res.status(201).json({
        success: true,
        data: strategy,
        message: "Strategy created from template successfully",
      });
    } catch (error) {
      loggerService.error("Error creating strategy from template:", error);

      if (error instanceof Error && error.message === "Strategy template not found") {
        res.status(404).json({
          success: false,
          error: "Strategy template not found",
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to create strategy from template",
        });
      }
    }
  }
);

/**
 * POST /api/strategy-templates/seed
 * Seed predefined strategy templates (admin only for development)
 */
router.post("/seed", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // In production, this should have admin authentication
    await strategyTemplateService.seedPredefinedStrategies();

    res.json({
      success: true,
      message: "Predefined strategy templates seeded successfully",
    });
  } catch (error) {
    loggerService.error("Error seeding predefined strategies:", error);
    res.status(500).json({
      success: false,
      error: "Failed to seed predefined strategies",
    });
  }
});

export default router;
