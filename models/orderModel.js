import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: Number,
      price: Number,
    },
  ],

  shippingAddress: {
    fullName: String,
    address: String,
    city: String,
    postalCode: String,
    phone: String,
  },

  paymentMethod: {
    type: String,
    enum: ["cod", "stripe", "razorpay"],
    required: true,
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },

  totalAmount: Number,

  orderStatus: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered"],
    default: "pending",
  },

}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
