import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { addToCart, getCart } from "../controllers/CartController.js";

const router = express.Router();

router.post("/add", authMiddleware, addToCart);
router.get("/", authMiddleware, getCart); // ✅ THIS WAS MISSING

export default router;
