import app from "./app.js";
import config from "./config/index.js";
import logger from "./utils/logger.js";

const server = app.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port}`);
});

const shutdown = () => {
  logger.info("Shutting down server");
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);