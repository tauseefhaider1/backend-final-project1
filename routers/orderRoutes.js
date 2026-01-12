import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminKeyMiddleware from "../middleware/adminmiddleware.js";
import {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById, // Add this import
} from "../controllers/orderController.js";

const router = express.Router();

/**
 * ===============================
 * USER → CREATE ORDER
 * POST /api/orders/create
 * ===============================
 */
router.post("/create", authMiddleware, createOrder);

/**
 * ===============================
 * USER → MY ORDERS
 * GET /api/orders/my
 * ===============================
 */
router.get("/my", authMiddleware, getMyOrders);

/**
 * ===============================
 * USER → SINGLE ORDER
 * GET /api/orders/:id
 * ===============================
 */

/**
 * ===============================
 * ADMIN → ALL ORDERS (KEY BASED)
 * GET /api/orders/admin
 * ===============================
 */
router.get(
  "/admin",
  adminKeyMiddleware, // 🔥 ADMIN KEY ONLY
  getAllOrders
);
router.get("/:id", authMiddleware, getOrderById);

export default router;