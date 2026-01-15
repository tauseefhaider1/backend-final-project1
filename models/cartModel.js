import mongoose from "mongoose";

// 1. Sub-schema for each cart item
const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
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
  // Optional fields (no longer required)
  name: { type: String },
  price: { type: Number },
  image: { type: String, default: "" },
}, { _id: false });

// 2. Main cart schema (this is cartSchema!)
const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  items: [cartItemSchema],         // ← use the sub-schema here
  cartTotal: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// 3. Auto-calculate totals before save
cartSchema.pre("save", function () {
  let total = 0;
  this.items.forEach((item) => {
    const price = item.price || 0;           // safe fallback
    item.itemTotal = price * item.quantity;
    total += item.itemTotal;
  });
  this.cartTotal = total;

});

// 4. Export the model (idempotent – safe for hot-reload)
const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

export default Cart;