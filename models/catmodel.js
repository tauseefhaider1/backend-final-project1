import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Category title is required"],
      trim: true,
      unique: true,
    },

    img: {
      type: String,
      required: [true, "Category image is required"],
    },

    slug: {
      type: String,
      lowercase: true,
      unique: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ===============================
   AUTO SLUG GENERATION
================================ */
categorySchema.pre("validate", function () {
  // Only regenerate slug if title changed
  if (this.isModified("title") && this.title) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
});

/* ===============================
   SOFT DELETE HELPER
================================ */
categorySchema.methods.softDelete = async function () {
  this.isActive = false;
  await this.save();
};

const Category = mongoose.model("Category", categorySchema);

export default Category;
