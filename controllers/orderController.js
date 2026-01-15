import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const orders = await Order.find({ user: userId })
      .populate("items.product", "name price image") // Populate product details
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("GET MY ORDERS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ correct (from authMiddleware)

    const orders = await Order.find({ user: userId })
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("GET MY ORDERS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};export const getAllOrders = async (req, res) => {
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

// Get single order by ID
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

    // Check if user owns this order (unless admin)
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