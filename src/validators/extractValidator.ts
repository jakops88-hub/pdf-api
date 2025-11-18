import { body } from "express-validator";
import { MAX_FILE_SIZE_BYTES, isSupportedMimeType } from "../utils/fileUtils.js";

export const extractValidationRules = [
  body("file").custom((_, { req }) => {
    const file: Express.Multer.File | undefined = req.file;
    if (!file) {
      throw new Error("File is required");
    }

    if (!isSupportedMimeType(file.mimetype)) {
      throw new Error("Unsupported file type. Use PDF, PNG or JPG.");
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error("File is too large");
    }

    return true;
  }),
];
