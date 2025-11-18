import dotenv from "dotenv";

dotenv.config();

export type LogLevel = "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";

export interface AppConfig {
  port: number;
  logLevel: LogLevel;
  allowedApiKeys: string[];
  ocrLanguages: string;
}

const parseAllowedKeys = (rawKeys?: string): string[] =>
  (rawKeys || "")
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);

const config: AppConfig = {
  port: Number(process.env.PORT) || 3000,
  logLevel: (process.env.LOG_LEVEL as LogLevel) || "info",
  get allowedApiKeys() {
    return parseAllowedKeys(process.env.ALLOWED_API_KEYS);
  },
  ocrLanguages: process.env.OCR_LANGUAGES || "eng+swe",
} as AppConfig;

export default config;
