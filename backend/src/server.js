import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import workflowRoutes from "./routes/workflowRoutes.js";

import connectDB from "./config/db.js";

dotenv.config();

const app = express();
const isVercel = Boolean(process.env.VERCEL);

const allowedOrigins = new Set(
  [
    process.env.CLIENT_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ].filter(Boolean)
);

const sanitizeMongoKeys = (value) => {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(sanitizeMongoKeys);
    return;
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete value[key];
      continue;
    }

    sanitizeMongoKeys(value[key]);
  }
};

const mongoSanitizeRequest = (req, _res, next) => {
  sanitizeMongoKeys(req.body);
  sanitizeMongoKeys(req.params);
  sanitizeMongoKeys(req.query);
  next();
};

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(mongoSanitizeRequest);

app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/workflows", workflowRoutes);
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Instagram Dashboard Backend is running!",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route nahi mila.",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

if (!isVercel) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export default app;
