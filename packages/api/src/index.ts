import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { galleriesRouter } from "./routes/galleries.js";
import { photosRouter } from "./routes/photos.js";
import { downloadRouter } from "./routes/download.js";
import { ordersRouter } from "./routes/orders.js";
import { errorHandler } from "./middleware/error.js";
import { requestLogger } from "./middleware/logger.js";

(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors({ origin: process.env.WEB_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(requestLogger);

app.use("/api/auth", authRouter);
app.use("/api/galleries", galleriesRouter);
app.use("/api/photos", photosRouter);
app.use("/api/download", downloadRouter);
app.use("/api/orders", ordersRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
