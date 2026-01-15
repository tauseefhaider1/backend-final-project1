import Cart from "../models/cartModel.js";
import Product from "../models/Product.js";
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

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




export const addToCart = async (req, res) => {
  console.log("🚀 ========== ADD TO CART STARTED ==========");
  console.log("📋 User ID:", req.user?.id);
  console.log("📋 Request body:", req.body);
  
  try {
    const { productId, quantity = 1 } = req.body; // Default quantity to 1
    const userId = req.user.id;

    // Validate inputs
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

    // 1️⃣ Fetch product
    console.log("🔍 Fetching product:", productId);
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 2️⃣ Get user's cart
    let cart = await Cart.findOne({ user: userId });

    // Prepare item data WITHOUT itemTotal (it will be calculated in pre-save)
    const itemData = {
      product: product._id,
      name: product.name,
      image: product.image || "",
      price: product.price,
      quantity: quantity,
      // itemTotal: NOT INCLUDED HERE - will be calculated in pre-save hook
    };

    console.log("📦 Item data:", itemData);

    if (!cart) {
      console.log("🆕 Creating new cart");
      // Create new cart
      cart = new Cart({
        user: userId,
        items: [itemData],
      });
    } else {
      console.log("📝 Updating existing cart");
      // Check if product already in cart
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        console.log("📈 Updating quantity");
        cart.items[itemIndex].quantity += quantity;
      } else {
        console.log("➕ Adding new item");
        cart.items.push(itemData);
      }
    }

    // 3️⃣ Save cart (pre-save hook will calculate totals)
    console.log("💾 Saving cart...");
    await cart.save();
    console.log("✅ Cart saved successfully");

    // 4️⃣ Fetch fresh cart with populated product details
    const populatedCart = await Cart.findOne({ user: userId })
      .populate('items.product', 'name price image')
      .lean();

    console.log("🎯 Final cart:", populatedCart);

    res.status(200).json({
      success: true,
      message: "Item added to cart",
      cart: populatedCart,
    });

  } catch (error) {
    console.error("❌ ADD TO CART ERROR:", error);
    
    // Handle specific Mongoose validation errors
    if (error.name === 'ValidationError') {
      console.error("Validation errors:", error.errors);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }
    
    // Handle MongoDB duplicate key error
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