import crypto from "node:crypto";
import User from "../models/usersmodels.js";

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // 1️⃣ Validate input
    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.toLowerCase();

    // 2️⃣ Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.otpHash || !user.otpExpires) {
      return res.status(400).json({
        message: "OTP not found or already used",
      });
    }

    // 3️⃣ Prevent re-verification
    if (user.isVerified) {
      return res.status(400).json({
        message: "User already verified",
      });
    }

    // 4️⃣ Check OTP expiry
    if (user.otpExpires < Date.now()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    // 5️⃣ Check max attempts BEFORE comparing
    if (user.otpAttempts >= 5) {
      return res.status(429).json({
        message: "Too many failed attempts. Please resend OTP",
      });
    }

    // 6️⃣ Hash provided OTP
    const hashedOtp = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    // 7️⃣ Safe constant-time comparison
    const hashedOtpBuffer = Buffer.from(hashedOtp, "hex");
    const storedOtpBuffer = Buffer.from(user.otpHash, "hex");

    if (hashedOtpBuffer.length !== storedOtpBuffer.length) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    const isValid = crypto.timingSafeEqual(
      hashedOtpBuffer,
      storedOtpBuffer
    );

    // 8️⃣ If OTP is WRONG → increment attempts
    if (!isValid) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();

      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    // 9️⃣ OTP SUCCESS → verify & cleanup
    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;

    await user.save();

    return res.status(200).json({
      message: "OTP verified successfully",
    });

  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
