// controllers/CartController.js
import Cart from "../models/cartModel.js";
import Product from "../models/Product.js"; // ✅ case-sensitive

// GET CART
export const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Populate product details for each item
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart) {
      return res.status(200).json({
        success: true,
        items: [],
      });
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

// ADD TO CART



// CartController.js - Add these logs
 export const addToCart = async (req, res) => {
  try {
    console.log('=== ADD TO CART DEBUG ===');
    console.log('Authorization Header:', req.headers.authorization);
    console.log('Cookies:', req.headers.cookie);
    console.log('Session:', req.session);
    console.log('User object from middleware:', req.user);
    console.log('User ID:', req.user?.id, req.user?._id);
    console.log('Request body:', req.body);
    
    // Check multiple possible user ID locations
    const userId = req.user?.id || req.user?._id || req.session?.userId;
    
    if (!userId) {
      console.log('ERROR: No user ID found anywhere!');
      console.log('Available properties on req.user:', Object.keys(req.user || {}));
      return res.status(401).json({
        success: false,
        message: "User not authenticated - no ID found",
      });
    }
    
    console.log('Using userId:', userId);
    
    // ... rest of your code
  } catch (error) {
    console.error("Add to cart error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to add item to cart",
      error: error.message // Include for debugging
    });
  }
}