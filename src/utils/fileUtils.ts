const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg"
];

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB upper limit

export const isSupportedMimeType = (mimeType?: string | null): boolean => {
  if (!mimeType) return false;
  return SUPPORTED_MIME_TYPES.includes(mimeType);
};

export const isPdfFile = (mimeType?: string | null): boolean => mimeType === "application/pdf";

export const isImageFile = (mimeType?: string | null): boolean =>
  mimeType === "image/png" || mimeType === "image/jpeg";

export const getFileExtension = (fileName?: string): string => {
  if (!fileName || !fileName.includes(".")) {
    return "";
  }
  return fileName.split(".").pop()!.toLowerCase();
};

export const splitTextByPage = (text: string): string[] => {
  if (!text) return [];
  // pdf-parse separates pages with form feed
  if (text.includes("\f")) {
    return text.split("\f").map((page) => page.trim());
  }
  return text.split(/\n(?=\s*Page \d+)|\n{2,}/).map((page) => page.trim());
};

export const isLikelyScannedPdf = (text: string): boolean => {
  const cleanedText = text.replace(/\s+/g, "");
  return cleanedText.length < 50; // heuristically treat very short text as scanned
};