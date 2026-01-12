import Category from "../models/catmodel.js";

/* ===============================
   CREATE OR REACTIVATE CATEGORY
================================ */
export const createCategories = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Title and image are required",
      });
    }

    // Check if category exists (case-insensitive)
    let category = await Category.findOne({
      title: { $regex: `^${title}$`, $options: "i" },
    });

    if (category) {
      if (!category.isActive) {
        category.isActive = true;
        category.img = `/uploads/categories/${req.file.filename}`;
        category.slug = title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        await category.save();
        return res.status(200).json({
          success: true,
          message: "Category reactivated successfully",
          category,
        });
      }
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    category = new Category({
      title,
      img: `/uploads/categories/${req.file.filename}`,
      // slug & isActive handled by schema
    });

    await category.save();
    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category with this title/slug already exists",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================
   GET ALL ACTIVE CATEGORIES
================================ */
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================
   UPDATE CATEGORY
================================ */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    let category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Update title
    if (title) category.title = title;

    // Update image if uploaded
    if (req.file) category.img = `/uploads/categories/${req.file.filename}`;

    // Slug auto-updates from model pre('validate')
    await category.save();

    res.status(200).json({ success: true, message: "Category updated", category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================
   SOFT DELETE CATEGORY
================================ */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category || !category.isActive) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    category.isActive = false;
    await category.save();

    res.status(200).json({ success: true, message: "Category deleted (soft)" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
