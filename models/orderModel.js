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
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      price: {
        type: Number,
        required: true
      },
      // ✅ ADD THESE FIELDS:
      title: {
        type: String,
        required: true
      },
      image: {
        type: String,
        default: ""
      }
    },
  ],

  shippingAddress: {
    fullName: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      default: ""
    },
    postalCode: {
      type: String,
      default: ""
    },
    phone: {
      type: String,
      required: true
    }
  },

  paymentMethod: {
    type: String,
    enum: ["cod", "stripe", "razorpay"],
    required: true,
    default: "cod"
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },

  totalAmount: {
    type: Number,
    required: true
  },

  orderStatus: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered"],
    default: "pending",
  },

}, { timestamps: true });

export default mongoose.model("Order", orderSchema);