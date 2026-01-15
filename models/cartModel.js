import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    itemTotal: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    cartTotal: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Auto-calculate totals
cartSchema.pre("save", function (next) {
  let total = 0;

  this.items.forEach((item) => {
    item.itemTotal = item.price * item.quantity;
    total += item.itemTotal;
  });

  this.cartTotal = total;
  next();
});

// Check if model already exists before defining it
const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

export default Cart;