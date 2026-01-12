import express from "express";
import adminKeyMiddleware from "../middleware/adminmiddleware.js";
import {
  createProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/Productcontroller.js";
import createUploader from "../middleware/upload.js";

const router = express.Router();

// 📦 Product image uploader
const productUpload = createUploader("products");

/* ==========================
   CLIENT ROUTES (PUBLIC)
========================== */

// 🔹 Get all products
// 🔹 Supports: ?category=ID & ?topRated=true
router.get("/", getProducts);

// 🔹 Get single product
router.get("/:id", getSingleProduct);

/* ==========================
   ADMIN ROUTES (PROTECTED)
========================== */

// 🔹 Create product
router.post(
  "/",
  adminKeyMiddleware,
  productUpload.single("image"),
  createProduct
);

// 🔹 Update product
router.put(
  "/:id",
  adminKeyMiddleware,
  productUpload.single("image"),
  updateProduct
);

// 🔹 Delete product
router.delete(
  "/:id",
  adminKeyMiddleware,
  deleteProduct
);

export default router;
