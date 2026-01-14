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
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    // 1️⃣ Fetch product snapshot
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 2️⃣ Get user's cart
    let cart = await Cart.findOne({ user: userId });

    const itemData = {
      product: product._id,
      name: product.name,
      image: product.image || "",
      price: product.price,
      quantity: quantity,
      // itemTotal will be calculated in pre-save hook
    };

    if (!cart) {
      // 3️⃣ Create cart if not exists
      cart = new Cart({
        user: userId,
        items: [itemData],
      });
    } else {
      // 4️⃣ Check if product already in cart
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
        // other snapshot fields remain same
      } else {
        cart.items.push(itemData);
      }
    }

    // 5️⃣ Save cart
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item added to cart",
      cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add item to cart",
    });
  }
};
