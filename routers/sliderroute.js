import express from "express";
import {
  createCategories,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/slider.js";

import adminKeyMiddleware from "../middleware/adminmiddleware.js";
import createUploader from "../middleware/upload.js";

const router = express.Router();
const categoryUpload = createUploader("categories");

/* ========= PUBLIC ========= */
// GET /api/categories
router.get("/categories", getCategories);

/* ========= ADMIN ========= */
// POST /api/categories
router.post(
  "/categories",
  adminKeyMiddleware,
  categoryUpload.single("image"),
  createCategories
);

// PUT /api/categories/:id
router.put(
  "/categories/:id",
  adminKeyMiddleware,
  categoryUpload.single("image"),
  updateCategory
);

// DELETE /api/categories/:id
router.delete(
  "/categories/:id",
  adminKeyMiddleware,
  deleteCategory
);

export default router;
