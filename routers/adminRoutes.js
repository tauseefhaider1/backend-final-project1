import express from "express";
import Order from "../models/orderModel.js";
import User from "../models/usersmodels.js";
import Product from "../models/Product.js";
import adminKeyMiddleware from "../middleware/adminmiddleware.js";

const router = express.Router();

/* ==========================
   VERIFY ADMIN KEY
========================== */
router.post("/verify-key", (req, res) => {
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({
      success: false,
      message: "Admin key is required",
    });
  }

  if (key !== process.env.ADMIN_KEY) {
    return res.status(401).json({
      success: false,
      message: "Invalid admin key",
    });
  }

  res.json({
    success: true,
    message: "Authentication successful",
  });
});

/* ==========================
   PROTECTED DASHBOARD ROUTES
========================== */
router.use(adminKeyMiddleware);

/* ==========================
   RECENT ORDERS
========================== */
router.get("/orders/recent", async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "name email")
      .lean();

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==========================
   TOP SELLING PRODUCTS
========================== */
router.get("/products/top", async (req, res) => {
  try {
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSales: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: 5 },
    ]);

    const productIds = topProducts.map((p) => p._id);

    const products = await Product.find(
      { _id: { $in: productIds } },
      "name price"
    );

    const result = topProducts.map((p) => {
      const product = products.find(
        (prod) => prod._id.toString() === p._id.toString()
      );

      return {
        productId: p._id,
        name: product?.name || "Unknown",
        sales: p.totalSales,
      };
    });

    res.json({ success: true, products: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==========================
   RECENT USERS
========================== */
router.get("/users/recent", async (req, res) => {
  try {
    const users = await User.find({}, "name email createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ==========================
   ADMIN STATS
========================== */
router.get("/stats", async (req, res) => {
  try {
    const [totalOrders, totalUsers, pendingOrders] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments(),
      Order.countDocuments({ status: "pending" }),
    ]);

    const revenue = await Order.aggregate([
      { $match: { status: "delivered" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    res.json({
      success: true,
      totalOrders,
      totalUsers,
      pendingOrders,
      totalRevenue: revenue[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
