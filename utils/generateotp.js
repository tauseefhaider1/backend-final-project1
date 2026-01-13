// utils/generateOtp.js
import crypto from "crypto";

const generateOtp = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const otpHash = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return { otp, otpHash, otpExpires };
};
export default generateOtp;