import { createLogger, format, transports } from "winston";
import config from "../config/index.js";

const logger = createLogger({
  level: config.logLevel,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.Console({
      level: config.logLevel,
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

export default logger;
