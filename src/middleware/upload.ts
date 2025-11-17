import multer from "multer";
import { Request } from "express";
import { isSupportedMimeType, MAX_FILE_SIZE_BYTES } from "../utils/fileUtils.js";
import { HttpError } from "./errorHandler.js";

const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (!isSupportedMimeType(file.mimetype)) {
    cb(new HttpError(400, "Unsupported file type. Use PDF, PNG or JPG."));
    return;
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});
