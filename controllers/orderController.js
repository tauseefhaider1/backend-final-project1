import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
import Product from "../models/Product.js";

// 🛠️ NEW: Get full image URL
const getFullImageUrl = (imagePath) => {
  if (!imagePath) return "";
  if (imagePath.startsWith('http')) return imagePath;
  return `https://backend-final-project1-production.up.railway.app${imagePath}`;
};

export const createOrder = async (req, res) => {
  console.log("========== CREATE ORDER ==========");
  
  try {
    const userId = req.user.id;
    const { shippingAddress, paymentMethod = "cod" } = req.body;

    // 1. Get and validate cart
    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: "items.product",
        select: "name price image",
        match: { _id: { $ne: null } } // ✅ Filter null products
      });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Cart is empty" 
      });
    }

    // ✅ Filter out null products
    const validCartItems = cart.items.filter(item => item.product !== null);
    if (validCartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart contains only invalid products"
      });
    }

    // 2. Validate shipping address
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.address || !shippingAddress.phone) {
      return res.status(400).json({
        success: false,
        message: "Full name, address, and phone are required"
      });
    }

    // 3. Prepare order items with CORRECT field names
    const items = validCartItems.map(item => ({
      product: item.product._id,
      name: item.product.name, // ✅ Changed from "title" to "name"
      image: getFullImageUrl(item.product.image), // ✅ Full URL
      price: item.product.price,
      quantity: item.quantity,
    }));

    // 4. Calculate total
    const totalAmount = items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    // 5. Create order
    const order = await Order.create({
      user: userId,
      items,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        address: shippingAddress.address,
        city: shippingAddress.city || "",
        postalCode: shippingAddress.postalCode || "",
        phone: shippingAddress.phone,
      },
      paymentMethod: paymentMethod === "credit_card" ? "cod" : paymentMethod, // ✅ Map credit_card to cod
      paymentStatus: "pending",
      orderStatus: "pending",
      totalAmount,
    });

    // 6. Clear cart
    cart.items = [];
    await cart.save();

    // 7. Return success
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      orderId: order._id,
      order: order
    });

  } catch (error) {
    console.error("ORDER CREATION ERROR:", error);
    res.status(500).json({ 
      success: false,
      message: error.message || "Failed to create order"
    });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({ user: userId })
      .populate("items.product", "name price image")
      .sort({ createdAt: -1 });

    // ✅ Convert image URLs to full URLs
    const ordersWithFullUrls = orders.map(order => ({
      ...order.toObject(),
      items: order.items.map(item => ({
        ...item,
        image: getFullImageUrl(item.image || item.product?.image)
      }))
    }));

    res.status(200).json({
      success: true,
      orders: ordersWithFullUrls,
    });
  } catch (error) {
    console.error("GET MY ORDERS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;

    const order = await Order.findById(orderId)
      .populate("user", "name email")
      .populate("items.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.user._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order"
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error("GET ORDER BY ID ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order"
    });
  }
};