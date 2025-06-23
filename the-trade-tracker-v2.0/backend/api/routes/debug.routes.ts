import { Router } from "express";

const router = Router();

// Debug routes for broker API testing
// TODO: Add debug endpoints as needed

router.get("/", (req, res) => {
  res.json({
    message: "Debug routes endpoint",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

export default router;
