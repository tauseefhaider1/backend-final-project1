import dotenv from "dotenv";
dotenv.config(); // ✅ MUST be first

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import sendOtpEmail from "./utils/sendOtpEmail.js";

// Routes
import cartRoutes from "./routers/CartRoutes.js";
import productRoutes from "./routers/productRoutes.js";
import sliderroute from "./routers/sliderroute.js";
import authRoutes from "./routers/authRoutes.js";
import orderRoutes from "./routers/orderRoutes.js";
import adminRoutes from "./routers/adminRoutes.js";

// Middleware
import authMiddleware from "./middleware/authMiddleware.js";

const app = express();

/* ================= PATH FIX (ES MODULE) ================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= BASIC SETUP ================= */
app.set("trust proxy", 1);

/* ================= SECURITY ================= */
app.use(
  helmet({
    crossOriginResourcePolicy: false, // ✅ allow images
  })
);

/* ================= BODY PARSING ================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

/* ================= CORS ================= */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "https://clientfinalproject.vercel.app",  // ✅ add this
      "https://adminfrontend-six.vercel.app",

    ],
    credentials: true,
  })
);

/* ================= STATIC FILES ================= */
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Debug logging for static files
app.use("/uploads", (req, res, next) => {
  const requestedPath = path.join(process.cwd(), "uploads", req.path);
  console.log(`📁 Static file request: ${req.path}`);
  console.log(`📁 Looking at: ${requestedPath}`);
  console.log(`📁 Exists: ${fs.existsSync(requestedPath)}`);
  next();
});

/* ================= REQUEST LOGGING ================= */
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/* ================= ROOT ROUTE ================= */
app.get("/", (req, res) => {
  res.send("🚀 Backend is running!");
});

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/product", productRoutes);      // products
app.use("/api", sliderroute);             // categories / sliders
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

/* ================= PERSIST LOGIN ================= */
app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

/* ================= GLOBAL ERROR HANDLER ================= */
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* ================= DATABASE ================= */
const mongoUrl = process.env.MONGO_URL;
const port = process.env.PORT || 8080;

if (!mongoUrl) {
  console.error("❌ MONGO_URL is missing in .env");
  process.exit(1);
}

mongoose
  .connect(mongoUrl)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });

/* ================= START SERVER ================= */
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
