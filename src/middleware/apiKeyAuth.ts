import { NextFunction, Request, Response } from "express";
import config from "../config/index.js";
import logger from "../utils/logger.js";

const hasAllowedKeys = (): boolean => config.allowedApiKeys.length > 0;

const isValidKey = (key?: string | null): boolean =>
  Boolean(key && config.allowedApiKeys.includes(key.trim()));

export const apiKeyAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!hasAllowedKeys()) {
    return next();
  }

  const providedKey = req.header("x-api-key");

  if (!isValidKey(providedKey)) {
    logger.warn("Blocked request due to invalid API key");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
};
