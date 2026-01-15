import mongoose from "mongoose"
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
  // Remove name, price, image — or make them optional
  name: { type: String },     // ← no required
  price: { type: Number },    // ← no required
  image: { type: String, default: "" },
}, { _id: false });
const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

export default Cart;