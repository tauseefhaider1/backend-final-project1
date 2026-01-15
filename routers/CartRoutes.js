import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { 
  addToCart, 
  getCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart,
  cleanupCart  // ✅ Added cleanup endpoint
} from "../controllers/CartController.js";

const router = express.Router();

router.post("/add", authMiddleware, addToCart);
router.get("/", authMiddleware, getCart);
router.put("/update/:productId", authMiddleware, updateCartItem);
router.delete("/remove/:productId", authMiddleware, removeFromCart);
router.delete("/clear", authMiddleware, clearCart);
router.post("/cleanup", authMiddleware, cleanupCart); // ✅ New cleanup route

export default router;