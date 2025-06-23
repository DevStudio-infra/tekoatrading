import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { loggerService } from "../../services/logger.service";

const router = Router();

/**
 * Serve chart images from the chart-output directory
 */
const serveChartImage = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    // Construct the full path to the chart image
    const chartOutputDir = path.join(__dirname, "../../chart-output");
    const imagePath = path.join(chartOutputDir, filename);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      loggerService.warn(`Chart image not found: ${imagePath}`);
      return res.status(404).json({ error: "Chart image not found" });
    }

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = "image/png";

    switch (ext) {
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".gif":
        contentType = "image/gif";
        break;
      case ".webp":
        contentType = "image/webp";
        break;
      default:
        contentType = "image/png";
    }

    // Set appropriate headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Stream the file
    const fileStream = fs.createReadStream(imagePath);
    fileStream.pipe(res);

    fileStream.on("error", (error) => {
      loggerService.error(`Error streaming chart image ${filename}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error serving chart image" });
      }
    });
  } catch (error) {
    loggerService.error("Error serving chart image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * List available chart images
 */
const listChartImages = async (req: Request, res: Response) => {
  try {
    const chartOutputDir = path.join(__dirname, "../../chart-output");

    if (!fs.existsSync(chartOutputDir)) {
      return res.json({ images: [] });
    }

    const files = fs
      .readdirSync(chartOutputDir)
      .filter((file) => /\.(png|jpg|jpeg|gif|webp)$/i.test(file))
      .map((file) => ({
        filename: file,
        url: `/api/chart/image/${file}`,
        created: fs.statSync(path.join(chartOutputDir, file)).mtime,
      }))
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    res.json({ images: files });
  } catch (error) {
    loggerService.error("Error listing chart images:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

router.get("/image/:filename", serveChartImage as any);
router.get("/list", listChartImages as any);

export default router;
