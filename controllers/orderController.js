import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
export const createOrder = async (req, res) => {
  console.log("========== CREATE ORDER STARTED ==========");
  console.log("User ID:", req.user?.id);
  console.log("Request body:", req.body);
  
  try {
    const userId = req.user.id;
    const { shippingAddress, paymentMethod = "cod" } = req.body;

    console.log("Looking for cart for user:", userId);
    const cart = await Cart.findOne({ user: userId })
      .populate("items.product");

    console.log("Cart found:", cart ? "Yes" : "No");
    console.log("Cart items:", cart?.items?.length);

    if (!cart || cart.items.length === 0) {
      console.log("Cart is empty or not found");
      return res.status(400).json({ 
        success: false,
        message: "Cart is empty" 
      });
    }

    // Validate cart items
    console.log("Validating cart items...");
    const invalidItems = cart.items.filter(item => !item.product);
    if (invalidItems.length > 0) {
      console.log("Found invalid items:", invalidItems);
      return res.status(400).json({
        success: false,
        message: `Cart contains ${invalidItems.length} invalid products`
      });
    }

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.address || !shippingAddress.phone) {
      console.log("Invalid shipping address:", shippingAddress);
      return res.status(400).json({
        success: false,
        message: "Shipping address is required"
      });
    }

    console.log("Preparing order items...");
    // Prepare order items
    const items = cart.items.map(item => {
      console.log("Processing cart item:", item);
      return {
        product: item.product._id,
        title: item.product.title || item.product.name,
        image: item.product.image,
        price: item.product.price,
        quantity: item.quantity,
      };
    });

    console.log("Order items prepared:", items);

    // Calculate total
    const totalAmount = items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    console.log("Total amount calculated:", totalAmount);

    // Create order
    console.log("Creating order in database...");
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

    console.log("Order created successfully:", order._id);

    // Clear cart
    console.log("Clearing cart...");
    cart.items = [];
    await cart.save();
    console.log("Cart cleared");

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate("items.product");

    console.log("========== ORDER CREATION SUCCESS ==========");
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: populatedOrder,
      orderId: order._id,
    });

  } catch (error) {
    console.error("========== ORDER CREATION ERROR ==========");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error:", error);
    
    // Check for specific MongoDB errors
    if (error.name === 'ValidationError') {
      console.error("Validation errors:", error.errors);
    }
    if (error.name === 'CastError') {
      console.error("Cast error - invalid ID:", error.value);
    }
    
    res.status(500).json({ 
      success: false,
      message: error.message || "Failed to create order",
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
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