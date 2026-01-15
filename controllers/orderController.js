import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, paymentMethod = "cod" } = req.body;

    const cart = await Cart.findOne({ user: userId })
      .populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Cart is empty" 
      });
    }

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.address || !shippingAddress.phone) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required"
      });
    }

    // Prepare order items
    const items = cart.items.map(item => {
      if (!item.product) {
        throw new Error(`Invalid product in cart: ${item.product}`);
      }
      return {
        product: item.product._id,
        title: item.product.title || item.product.name,
        image: item.product.image,
        price: item.product.price,
        quantity: item.quantity,
      };
    });

    // Calculate total
    const totalAmount = items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    // Create order
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
      paymentMethod: paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
      totalAmount,
    });

    // Clear cart
    cart.items = [];
    await cart.save();

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate("items.product");

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: populatedOrder,
      orderId: order._id,
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