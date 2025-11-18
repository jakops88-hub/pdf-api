import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger.js";

export class HttpError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ error: "Not Found" });
};

export const errorHandler = (
  err: Error & { statusCode?: number },
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const statusCode = err.statusCode ?? 500;
  const isServerError = statusCode >= 500;

  logger.error("Request failed", {
    statusCode,
    path: req.path,
    message: err.message,
    stack: err.stack,
  });

  res.status(statusCode).json({
    error: isServerError ? "Internal server error" : err.message,
  });
};
