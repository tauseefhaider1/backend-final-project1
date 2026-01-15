import mongoose from "mongoose";
import Cart from "../models/cartModel.js";
import Product from "../models/Product.js";

// 🛠️ NEW: Image URL Helper
const getFullImageUrl = (imagePath) => {
  if (!imagePath) return "";
  if (imagePath.startsWith('http')) return imagePath;
  return `https://backend-final-project1-production.up.railway.app${imagePath}`;
};

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    let cart = await Cart.findOne({ user: userId })
      .populate({
        path: "items.product",
        select: "name price image",
        match: { _id: { $ne: null } } // ✅ Filter out null products
      });

    if (!cart) {
      cart = { items: [], cartTotal: 0 };
    } else {
      // ✅ Filter out items with null products
      cart.items = cart.items.filter(item => item.product !== null);
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
  console.log("🚀 ADD TO CART STARTED");
  console.log("User ID:", req.user?.id);
  console.log("Product ID:", req.body.productId);

  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user.id;

    // 1. Validate
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID",
      });
    }

    // 2. Fetch product with validation
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or deleted",
      });
    }

    if (!product.price || product.price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Product price is invalid",
      });
    }

    // 3. Find or create cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: []
      });
    }

    // 4. Add/Update item
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += Number(quantity);
    } else {
      cart.items.push({
        product: product._id,
        quantity: Number(quantity),
        price: product.price
      });
    }

    await cart.save();

    // 5. Return populated cart with filtered null products
    const populatedCart = await Cart.findOne({ user: userId })
      .populate({
        path: "items.product",
        select: "name price image",
        match: { _id: { $ne: null } }
      });

    // Ensure no null products in response
    if (populatedCart) {
      populatedCart.items = populatedCart.items.filter(item => item.product !== null);
    }

    res.status(200).json({
      success: true,
      message: "Item added to cart",
      cart: populatedCart || { items: [], cartTotal: 0 },
    });

  } catch (error) {
    console.error("ADD TO CART ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add item to cart",
    });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid Product ID" 
      });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: "Cart not found" 
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: "Item not found in cart" 
      });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    const updatedCart = await Cart.findOne({ user: userId })
      .populate("items.product", "name price image");

    res.status(200).json({ 
      success: true, 
      cart: updatedCart 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: "Cart not found" 
      });
    }

    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );
    await cart.save();

    const updatedCart = await Cart.findOne({ user: userId })
      .populate("items.product", "name price image");

    res.status(200).json({ 
      success: true, 
      cart: updatedCart 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: "Cart not found" 
      });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({ 
      success: true, 
      cart: { items: [], cartTotal: 0 },
      message: "Cart cleared successfully" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// 🆕 NEW: Cleanup endpoint for invalid products
export const cleanupCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: "Cart not found" 
      });
    }

    const originalCount = cart.items.length;
    
    // Filter out invalid items
    const validItems = [];
    for (const item of cart.items) {
      try {
        const product = await Product.findById(item.product);
        if (product && product.price > 0) {
          validItems.push(item);
        }
      } catch (error) {
        console.log(`Invalid product ${item.product} removed`);
      }
    }

    cart.items = validItems;
    await cart.save();

    const cleanCart = await Cart.findOne({ user: userId })
      .populate("items.product", "name price image");

    res.status(200).json({
      success: true,
      message: `Removed ${originalCount - validItems.length} invalid items`,
      cart: cleanCart
    });

  } catch (error) {
    console.error("Cart cleanup error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clean cart"
    });
  }
};