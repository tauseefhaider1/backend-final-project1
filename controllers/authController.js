import User from "../models/usersmodels.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import {
  signupUserSchema,
  loginUserSchema,
  resetPasswordSchema,
} from "../validations/authValidation.js";

import  generateOtp  from "../utils/generateotp.js";
import sendOtpEmail from "../utils/sendOtpEmail.js";
import { sessionManager } from "../utils/sessionManager.js"; // Single import
import userProfile from "../models/userProfile.js";

/* ================= SIGNUP ================= */
export const signup = async (req, res) => {
  try {
    const parsed = signupUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.errors,
      });
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    
    // If user exists and is verified
    if (existingUser && existingUser.isVerified) {
      return res.status(409).json({ 
        message: "User already exists. Please login." 
      });
    }
    
    // If user exists but not verified
    if (existingUser && !existingUser.isVerified) {
      // Generate new OTP
      const { otp, otpHash, otpExpires } = generateOtp();
      
      // Update existing user with new OTP and reset attempts
      existingUser.name = name;
      existingUser.password = password; // Will be hashed by pre-save
      existingUser.otpHash = otpHash;
      existingUser.otpExpires = otpExpires;
      existingUser.otpAttempts = 0;
      
      await existingUser.save();
      await sendOtpEmail(normalizedEmail, otp);
      
      return res.status(200).json({
        message: "OTP resent to your email",
        otpRequired: true,
      });
    }

    // Create new user
    const { otp, otpHash, otpExpires } = generateOtp();

    await User.create({
      name,
      email: normalizedEmail,
      password,
      otpHash,
      otpExpires,
      isVerified: false,
      otpAttempts: 0, // Initialize attempts
    });

    await sendOtpEmail(normalizedEmail, otp);

    return res.status(201).json({
      message: "Signup successful. OTP sent to email.",
      otpRequired: true,
    });
  } catch (error) {
  console.error("Signup error:", error.message, error);
  return res.status(500).json({ message: error.message });
}

};

/* ================= LOGIN ================= */
export const login = async (req, res) => {
  try {
    const parsed = loginUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid input",
        errors: parsed.error.errors,
      });
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email: email.toLowerCase() })
      .select("+password");

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({ 
        success: false,
        message: "Please verify your email first",
        requiresVerification: true,
        email: user.email
      });
    }

    // Check if account is locked (failed attempts)
    if (user.failedLoginAttempts >= 5) {
      const lockTime = 15 * 60 * 1000; // 15 minutes
      if (!user.accountLockedUntil || user.accountLockedUntil < new Date()) {
        // Reset if lock expired
        user.failedLoginAttempts = 0;
        user.accountLockedUntil = null;
        await user.save();
      } else {
        return res.status(423).json({ 
          success: false,
          message: "Account temporarily locked. Try again later.",
          lockedUntil: user.accountLockedUntil
        });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      
      if (user.failedLoginAttempts >= 5) {
        user.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      
      await user.save();
      
      return res.status(400).json({ 
        success: false,
        message: "Invalid email or password",
        attemptsLeft: 5 - (user.failedLoginAttempts || 0)
      });
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Add session to manager
    sessionManager.addSession(user._id.toString(), token, req);

  res.cookie("token", token, {
  httpOnly: true,
  secure: true,           // ✅ REQUIRED
  sameSite: "none",       // ✅ REQUIRED
  maxAge: 24 * 60 * 60 * 1000,
  path: "/",
});


    return res.status(200).json({
      success: true,
      message: "Login successful",
        token: token, // ✅ ADD THIS LINE - frontend needs the token

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};
// import jwt from "jsonwebtoken";
// import { sessionManager } from "../utils/sessionManager.js";

export const logout = (req, res) => {
  try {
    const token = req.cookies?.token;

    // Remove session if token exists
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.userId) {
          sessionManager.removeSession(decoded.userId);
        }
      } catch (err) {
        // Token already invalid/expired — ignore
      }
    }

   res.clearCookie("token", {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
});


    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(200).json({
      success: true,
      message: "Logged out (safe fallback)",
    });
  }
};

/* ================= RESET PASSWORD ================= */
export const resetPassword = async (req, res) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.errors,
      });
    }

    const { email, otp, newPassword } = parsed.data;

    const user = await User.findOne({ email: email.toLowerCase() })
      .select("+password");

    if (!user || !user.otpHash || !user.otpExpires) {
      return res.status(400).json({ 
        success: false,
        message: "OTP not found" 
      });
    }

    // Check if user is verified (only verified users should reset password)
    if (!user.isVerified) {
      return res.status(400).json({ 
        success: false,
        message: "Please verify your email first" 
      });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ 
        success: false,
        message: "OTP expired" 
      });
    }

    // Check OTP attempts
    if (user.otpAttempts >= 5) {
      return res.status(429).json({ 
        success: false,
        message: "Too many failed attempts. Please request a new OTP" 
      });
    }

    const hashedOtp = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(hashedOtp, "hex"),
      Buffer.from(user.otpHash, "hex")
    );

    if (!isValid) {
      // Increment OTP attempts on failure
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      
      return res.status(400).json({ 
        success: false,
        message: "Invalid OTP",
        attemptsLeft: 5 - user.otpAttempts 
      });
    }

    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ 
        success: false,
        message: "New password cannot be same as old password" 
      });
    }

    // Reset OTP attempts on success
    user.otpAttempts = 0;
    user.otpHash = undefined;
    user.otpExpires = undefined;
    user.password = newPassword; // This will be hashed by pre-save hook

    // Invalidate all existing sessions for security
    sessionManager.invalidateUserSessions(user._id.toString());

    await user.save();

    // Auto-login
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Create new session
    sessionManager.addSession(user._id.toString(), token, req);
res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 24 * 60 * 60 * 1000,
  path: "/",
});


    return res.status(200).json({
      success: true,
      message: "Password reset successful",
      autoLogin: true,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

/* ================= RESEND OTP ================= */
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Add email validation
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: "Email is required" 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid email format" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Check if user is already verified
    if (user.isVerified) {
      // For password reset, we allow resend OTP even for verified users
      // But we should check if they have an active OTP request
      if (!user.otpHash || !user.otpExpires) {
        return res.status(400).json({ 
          success: false,
          message: "No active OTP request. Please request OTP first." 
        });
      }
    }

    const { otp, otpHash, otpExpires } = generateOtp();

    user.otpHash = otpHash;
    user.otpExpires = otpExpires;
    user.otpAttempts = 0; // Reset attempts on resend
    await user.save();

    await sendOtpEmail(user.email, otp);

    return res.status(200).json({
      success: true,
      message: "New OTP sent to your email",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

// /* ================= CHECK AUTH STATUS ================= */
// export const checkAuth = async (req, res) => {
//   try {
//     const token = req.cookies?.token;
    
//     if (!token) {
//       return res.status(200).json({ 
//         success: false,
//         authenticated: false,
//         message: "No active session" 
//       });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
//     // Check session in session manager
//     if (!sessionManager.isValidSession(decoded.userId)) {
//       res.clearCookie("token");
//       return res.status(200).json({ 
//         success: false,
//         authenticated: false,
//         message: "Session expired" 
//       });
//     }

//     const user = await User.findById(decoded.userId).select("-password -__v");

//     if (!user) {
//       sessionManager.removeSession(decoded.userId);
//       res.clearCookie("token");
//       return res.status(200).json({ 
//         success: false,
//         authenticated: false,
//         message: "User not found" 
//       });
//     }
//     const profile = await userProfile.findOne({ user: user._id });

//     return res.status(200).json({
//       success: true,
//       authenticated: true,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         isVerified: user.isVerified,
//         avatar: profile?.avatar || null // <-- include avatar
//       },
//     });
//   } catch (error) {
//     // Clear invalid token
//     res.clearCookie("token");
//     return res.status(200).json({ 
//       success: false,
//       authenticated: false,
//       message: "Invalid session" 
//     });
//   }
// };

/* ================= CHANGE PASSWORD ================= */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId).select("+password");
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: "Current password is incorrect" 
      });
    }

    // Check if new password is same as old
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ 
        success: false,
        message: "New password cannot be same as old password" 
      });
    }

    // Check password history (last 3 passwords)
    if (await user.wasPasswordUsed(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "You cannot reuse your last 3 passwords"
      });
    }

    // Update password (will trigger pre-save hook)
    user.password = newPassword;
    
    // Invalidate all existing sessions for security
    sessionManager.invalidateUserSessions(userId);
    
    await user.save();

    return res.status(200).json({ 
      success: true,
      message: "Password changed successfully. Please login again." 
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};
// GET /me
export const getProfile = async (req, res) => {
  try {
    const profile = await userProfile.findOne({ user: req.user.id });
    return res.json({
      authenticated: true,
      user: {
        ...req.user.toObject(), // includes name, email, role
        avatar: profile?.avatar || null, // client's avatar
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ authenticated: false, message: "Server error" });
  }
};

/* ================= GET MY SESSIONS ================= */
export const getMySessions = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const sessions = sessionManager.getUserSessions(userId);
    
    // Sanitize session data for response
    const sanitizedSessions = sessions.map(session => ({
      id: session.userId,
      lastActive: session.lastActive,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      isValid: session.isValid
    }));

    return res.status(200).json({
      success: true,
      message: "Sessions retrieved",
      sessions: sanitizedSessions,
      count: sessions.length
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

/* ================= GET ALL ACTIVE SESSIONS (ADMIN) ================= */
export const getActiveSessions = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false,
        message: "Admins only" 
      });
    }

    const sessions = sessionManager.getAllSessions();
    
    return res.status(200).json({
      success: true,
      message: "All active sessions",
      sessions: sessions,
      count: sessions.length
    });
  } catch (error) {
    console.error("Get all sessions error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    console.log("Uploaded file:", req.file); // Debug log
    
    const userId = req.user.id;
    let profile = await userProfile.findOne({ user: userId });
    if (!profile) {
      profile = new userProfile({ user: userId });
    }

    // Delete old avatar if exists
    if (profile.avatar) {
      const oldPath = path.join(process.cwd(), profile.avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save new avatar path - should be "/uploads/avatars/filename.jpg"
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    profile.avatar = avatarPath;
    await profile.save();

    // Get updated user data
    const user = await User.findById(userId).select("-password -otpHash -otpExpires");
    
    // ✅ Return full URL
    const protocol = req.protocol;
    const host = req.get('host');
    const fullAvatarUrl = `${protocol}://${host}${avatarPath}`;
    
    console.log("Avatar saved at:", avatarPath);
    console.log("Full URL:", fullAvatarUrl);
    
    return res.status(200).json({ 
      success: true, 
      message: "Profile picture updated!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: fullAvatarUrl, // Full URL for frontend
      }
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
/* ================= REVOKE SESSION ================= */
export const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id.toString();
    
    // Users can only revoke their own sessions unless admin
    if (req.user.role !== "admin" && sessionId !== userId) {
      return res.status(403).json({ 
        success: false,
        message: "You can only revoke your own sessions" 
      });
    }

    const removed = sessionManager.removeSession(sessionId);
    
    if (removed) {
      return res.status(200).json({ 
        success: true,
        message: "Session revoked successfully" 
      });
    } else {
      return res.status(404).json({ 
        success: false,
        message: "Session not found" 
      });
    }
  } catch (error) {
    console.error("Revoke session error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

/* ================= REFRESH TOKEN ================= */
export const refreshToken = async (req, res) => {
  try {
    const oldToken = req.cookies?.token;
    if (!oldToken) {
      return res.status(401).json({ 
        success: false,
        message: "No token provided" 
      });
    }
    
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);
    
    // Check if session exists
    if (!sessionManager.isValidSession(decoded.userId)) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid session" 
      });
    }
    
    // Issue new token
    const newToken = jwt.sign(
      { userId: decoded.userId, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    // Update session
    sessionManager.updateSession(decoded.userId, newToken, req);
    
    res.cookie("token", newToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    
    return res.status(200).json({ 
      success: true,
      message: "Token refreshed" 
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(401).json({ 
      success: false,
      message: "Invalid token" 
    });
  }
};

/* ================= UPDATE PROFILE ================= */
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // If email is being changed, need to verify new email
    if (email && email !== user.email) {
      // Check if new email is already taken
      const emailExists = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: userId }
      });
      
      if (emailExists) {
        return res.status(400).json({ 
          success: false,
          message: "Email already in use" 
        });
      }
      
      // Generate OTP for email verification
      const { otp, otpHash, otpExpires } = generateOtp();
      
      user.email = email.toLowerCase();
      user.isVerified = false; // Require verification for new email
      user.otpHash = otpHash;
      user.otpExpires = otpExpires;
      user.otpAttempts = 0;
      
      await sendOtpEmail(email, otp);
      
      // Invalidate all sessions for security
      sessionManager.invalidateUserSessions(userId);
      
      await user.save();
      
      return res.status(200).json({
        success: true,
        message: "Profile updated. Please verify your new email.",
        requiresVerification: true
      });
    }

    // Update name only
    if (name) {
      user.name = name;
    }
    
    await user.save();

    return res.status(200).json({ 
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};