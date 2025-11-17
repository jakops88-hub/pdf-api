import express from "express";
import healthRoute from "./routes/healthRoute.js";
import extractRoute from "./routes/extractRoute.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  logger.info("Incoming request", { method: req.method, path: req.path });
  next();
});

app.use(healthRoute);
app.use(extractRoute);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;