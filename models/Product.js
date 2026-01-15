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
      default: 0, // Changed from required: true to default: 0
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
  console.log("🔄 Pre-save hook running for cart:", this._id);
  
  let total = 0;

  this.items.forEach((item) => {
    // Calculate item total
    item.itemTotal = item.price * (item.quantity || 1);
    console.log(`   Item: ${item.name}, Price: ${item.price}, Qty: ${item.quantity}, Total: ${item.itemTotal}`);
    total += item.itemTotal;
  });

  this.cartTotal = total;
  console.log(`   Cart total calculated: ${total}`);
  next();
});

// Also add validation to ensure itemTotal is calculated
cartSchema.post('validate', function(doc) {
  console.log("✅ Cart validation passed");
});

export default mongoose.model("Cart", cartSchema);