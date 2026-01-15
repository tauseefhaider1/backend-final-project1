import mongoose from "mongoose";
import Cart from "../models/cartModel.js";
import Product from "../models/Product.js";

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    let cart = await Cart.findOne({ user: userId })
      .populate("items.product", "name price image"); // populate only needed fields

    if (!cart) {
      cart = { items: [], cartTotal: 0 }; // consistent empty cart shape
    }

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
    });
  }
};

export const addToCart = async (req, res) => {
  console.log("🚀 ========== ADD TO CART STARTED ==========");
  console.log("📋 User ID:", req.user?.id);
  console.log("📋 Request body:", req.body);

  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user.id;

    // 1. Validate inputs
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID",
      });
    }

    // 2. Fetch product
    console.log("🔍 Fetching product:", productId);
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 3. Prepare minimal item data (only required fields)
    const itemData = {
      product: product._id,
      quantity: Number(quantity) || 1,
      // Optional: store price if you want it without populate every time
      price: Number(product.price) || 0, // safe fallback
    };

    console.log("📦 Minimal item data:", itemData);

    // 4. Find or create cart
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      console.log("🆕 Creating new cart");
      cart = new Cart({
        user: userId,
        items: [itemData],
      });
    } else {
      console.log("📝 Updating existing cart");
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        console.log("📈 Updating existing item quantity");
        cart.items[itemIndex].quantity += itemData.quantity;
        // price should already exist or be set — pre-save will recalculate
      } else {
        console.log("➕ Adding new item to cart");
        cart.items.push(itemData);
      }
    }

    console.log("💾 Saving cart...");
    await cart.save(); // pre-save hook calculates itemTotal & cartTotal
    console.log("✅ Cart saved successfully");

    // 5. Return fresh populated cart
    const populatedCart = await Cart.findOne({ user: userId })
      .populate("items.product", "name price image")
      .lean();

    console.log("🎯 Final populated cart:", populatedCart);

    res.status(200).json({
      success: true,
      message: "Item added to cart",
      cart: populatedCart,
    });
  } catch (error) {
    console.error("❌ ADD TO CART ERROR:", error);

    if (error.name === "ValidationError") {
      console.error("Validation errors:", error.errors);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.keys(error.errors).map((key) => ({
          field: key,
          message: error.errors[key].message,
        })),
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "User already has a cart",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to add item to cart",
    });
  }
};
// Add after your existing getCart and addToCart functions
// Add these functions after your existing addToCart function

export const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    // Validate
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid Product ID" });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    // Find and update item
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    // Return updated cart
    const updatedCart = await Cart.findOne({ user: userId })
      .populate("items.product", "name price image")
      .lean();

    res.status(200).json({ success: true, cart: updatedCart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    let cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    // Remove item
    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();

    const updatedCart = await Cart.findOne({ user: userId })
      .populate("items.product", "name price image")
      .lean();

    res.status(200).json({ success: true, cart: updatedCart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    let cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    // Clear all items
    cart.items = [];
    await cart.save();

    res.status(200).json({ 
      success: true, 
      cart: { items: [], cartTotal: 0 },
      message: "Cart cleared successfully" 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};