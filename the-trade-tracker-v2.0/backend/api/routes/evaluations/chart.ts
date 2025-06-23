// @ts-nocheck - Disable TypeScript checking for this file to handle method compatibility
import { Router, Request, Response } from "express";
import { evaluationService } from "../../../services/evaluation.service";
import { authenticate } from "../../middlewares/auth.middleware";
import * as fs from "fs";
import * as path from "path";

const router = Router();

/**
 * @swagger
 * /api/evaluations/chart/{id}:
 *   get:
 *     summary: Get chart image for an evaluation
 *     description: Retrieves the chart image generated for a specific evaluation
 *     tags: [Evaluations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Evaluation ID
 *     responses:
 *       200:
 *         description: Chart image
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Chart not found
 *       500:
 *         description: Server error
 */
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const evaluationId = parseInt(req.params.id, 10);

    // First get the evaluation to check ownership
    // @ts-ignore - Convert userId to number as expected by the service
    const evaluation = await evaluationService.getEvaluationById(evaluationId, Number(userId));

    if (!evaluation || !evaluation.chartUrl) {
      return res.status(404).json({
        status: "error",
        message: "Chart image not found",
      });
    }

    // Get the chart image path from the evaluation
    const chartImagePath = evaluation.chartUrl;
    let imagePath = "";

    // Check if it's a URL or a local path
    if (chartImagePath.startsWith("http")) {
      // TODO: Handle remote images if needed
      return res.redirect(chartImagePath);
    } else {
      // Assume it's a local path relative to the public directory
      imagePath = path.join(process.cwd(), "public", chartImagePath);
    }

    // Check if the file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        status: "error",
        message: "Chart image file not found",
      });
    }

    // Read and return the file
    const fileContent = fs.readFileSync(imagePath);
    res.setHeader("Content-Type", "image/png");
    return res.send(fileContent);
  } catch (error) {
    console.error("Error retrieving chart image:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve chart image",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
