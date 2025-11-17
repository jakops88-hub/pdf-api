import { NextFunction, Request, Response, Router } from "express";
import { apiKeyAuthMiddleware } from "../middleware/apiKeyAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { upload } from "../middleware/upload.js";
import { extractionService } from "../services/extractionService.js";
import { extractValidationRules } from "../validators/extractValidator.js";
import logger from "../utils/logger.js";

const router = Router();

router.post(
  "/extract",
  apiKeyAuthMiddleware,
  upload.single("file"),
  ...extractValidationRules,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "File is required" });
        return;
      }

      const result = await extractionService.extract({
        buffer: req.file.buffer,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
      });

      res.json(result);
    } catch (error) {
      logger.error("Extraction failed", { error });
      next(error);
    }
  }
);

export default router;