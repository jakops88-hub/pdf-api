import { NextFunction, Request, Response } from "express";
import config from "../config/index.js";
import logger from "../utils/logger.js";

export const apiKeyAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!config.apiKey) {
    return next();
  }

  const providedKey = req.header("x-api-key");

  if (!providedKey || providedKey !== config.apiKey) {
    logger.warn("Blocked request due to invalid API key");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
};
