import dotenv from "dotenv";

dotenv.config();

export type LogLevel = "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";

export interface AppConfig {
  port: number;
  logLevel: LogLevel;
  apiKey?: string;
  ocrLanguages: string;
}

const config: AppConfig = {
  port: Number(process.env.PORT) || 3000,
  logLevel: (process.env.LOG_LEVEL as LogLevel) || "info",
  apiKey: process.env.API_KEY,
  ocrLanguages: process.env.OCR_LANGUAGES || "eng+swe",
};

export default config;