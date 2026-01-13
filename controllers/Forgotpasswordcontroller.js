import crypto from "crypto";
import User from "../models/usersmodels.js";
import  generateOtp  from "../utils/generateotp.js"
import sendOtpEmail from "../utils/sendOtpEmail.js"

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { otp, otpHash, otpExpires } = generateOtp();

    user.otpHash = otpHash;
    user.otpExpires = otpExpires;
    await user.save();

    await sendOtpEmail(user.email, otp);

    res.status(200).json({
      message: "OTP sent to email",
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
