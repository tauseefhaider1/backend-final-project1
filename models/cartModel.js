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
      // ✅ REMOVE: required: true,
      // ✅ ADD: default: function() { return this.price * this.quantity; }
      default: function() {
        return (this.price || 0) * (this.quantity || 1);
      }
    },
  },
  { _id: false }
);