import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    name: {
      type: String, // snapshot (product name at time of add)
      required: true,
    },

    image: {
      type: String, // snapshot
      default: "",
    },

    price: {
      type: Number, // snapshot price
      required: true,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    itemTotal: {
      type: Number,
      required: true,
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
      unique: true, // one cart per user
    },

    items: [cartItemSchema],

    cartTotal: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/* ==========================
   AUTO CALCULATE TOTAL
========================== */
cartSchema.pre("save", function (next) {
  let total = 0;

  this.items.forEach((item) => {
    item.itemTotal = item.price * item.quantity;
    total += item.itemTotal;
  });

  this.cartTotal = total;
  next();
});

export default mongoose.model("Cart", cartSchema);
