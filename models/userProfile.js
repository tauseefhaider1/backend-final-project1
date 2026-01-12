import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  avatar: {
    type: String, // Cloudinary URL
    default: ""
  },

  phone: String,

  address: {
    street: String,
    city: String,
    country: String,
    postalCode: String
  },

  dateOfBirth: Date,

  gender: {
    type: String,
    enum: ["male", "female", "other"]
  }
}, { timestamps: true });

export default mongoose.model("UserProfile", userProfileSchema);
