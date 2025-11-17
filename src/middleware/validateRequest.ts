import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { HttpError } from "./errorHandler.js";

export const validateRequest = (req: Request, _res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    next(new HttpError(400, firstError.msg, errors.array()));
    return;
  }

  next();
};
