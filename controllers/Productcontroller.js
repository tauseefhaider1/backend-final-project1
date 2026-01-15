import Product from "../models/Product.js";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

/* ==========================
   CREATE PRODUCT
========================== */
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      originalPrice,
      rating,
      discount,
      stockStatus,
      topRated,
      category,
    } = req.body;

    // ✅ Required validation
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: "Name, price and category are required",
      });
    }

    // ✅ Validate category ObjectId
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const imagePath = req.file
      ? `/uploads/products/${req.file.filename}`
      : "";

    const product = await Product.create({
      name: name.trim(),
      description,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      rating: rating ? Number(rating) : 0,
      discount: discount ? Number(discount) : 0,
      stockStatus: stockStatus || "in",
      topRated: topRated === "true" || topRated === true,
      category,
      image: imagePath,
    });

    res.status(201).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

/* ==========================
   READ ALL PRODUCTS
   + FILTERS
========================== */
export const getProducts = async (req, res) => {
  try {
    const { category, topRated } = req.query;
    const filter = {};

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    if (topRated === "true") {
      filter.topRated = true;
    }

    const products = await Product.find(filter)
      .populate("category", "title slug img")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      products, // ✅ ALWAYS ARRAY
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      products: [],
      message: error.message,
    });
  }
};

/* ==========================
   READ SINGLE PRODUCT
========================== */
export const getSingleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "title slug img");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }
};

/* ==========================
   UPDATE PRODUCT
========================== */
/* ==========================
   UPDATE PRODUCT
========================== */
export const updateProduct = async (req, res) => {
  try {
    const updatedData = {};

    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) {
        updatedData[key] = req.body[key];
      }
    });

    if (updatedData.price) updatedData.price = Number(updatedData.price);
    if (updatedData.originalPrice)
      updatedData.originalPrice = Number(updatedData.originalPrice);
    if (updatedData.rating) updatedData.rating = Number(updatedData.rating);
    if (updatedData.discount)
      updatedData.discount = Number(updatedData.discount);

    updatedData.topRated =
      req.body.topRated === "true" || req.body.topRated === true;

    // ✅ IMAGE REPLACEMENT (FIXED)
    if (req.file) {
      updatedData.image = `/uploads/products/${req.file.filename}`;

      const oldProduct = await Product.findById(req.params.id);

      if (oldProduct?.image) {
        const oldPath = path.join(
          process.cwd(),
          oldProduct.image.replace(/^\/+/, "")
        );

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    ).populate("category", "title slug img");

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ==========================
   DELETE PRODUCT
========================== *//* ==========================
   DELETE PRODUCT
========================== */
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // ✅ IMAGE DELETE FIXED
    if (product.image) {
      const imagePath = path.join(
        process.cwd(),
        product.image.replace(/^\/+/, "")
      );

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
