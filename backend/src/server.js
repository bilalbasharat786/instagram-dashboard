import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import workflowRoutes from "./routes/workflowRoutes.js";

import connectDB from "./config/db.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(helmet());

app.use(express.json());

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

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();