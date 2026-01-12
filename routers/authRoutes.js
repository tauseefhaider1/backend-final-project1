import express from "express";

// Controllers
import {
  signup,
  login,
  logout,
  resetPassword,
  resendOtp,
  checkAuth,
  changePassword,
  getMySessions,
  getActiveSessions,
  revokeSession,
  refreshToken,
  updateProfile,
  updateAvatar
} from "../controllers/authController.js";
import User from "../models/usersmodels.js"
import { verifyOtp } from "../controllers/verifyotpcontroller.js";
import { forgotPassword } from "../controllers/Forgotpasswordcontroller.js";

// Middleware
import authMiddleware, { adminMiddleware } from "../middleware/authMiddleware.js"
import { otpLimiter, loginLimiter } from "../middleware/rateLimiter.js";
import createUploader from "../middleware/upload.js";
import userProfile from "../models/userProfile.js";

const avatarUpload = createUploader("avatars");

const router = express.Router();

// ================= PUBLIC ROUTES (No Authentication Required) =================

// Authentication
router.post("/signup", signup);
router.post("/login", loginLimiter, login);

// OTP Operations
router.post("/verify-otp", otpLimiter, verifyOtp);
router.post("/resend-otp", otpLimiter, resendOtp);

// Password Management
router.post("/forgot-password", otpLimiter, forgotPassword);
router.post("/reset-password", otpLimiter, resetPassword);

// Check Authentication Status
router.get("/check", checkAuth);

// Token Refresh
router.post("/refresh-token", refreshToken);

// ================= PROTECTED ROUTES (Authentication Required) =================
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -otpHash -otpExpires");
    const profile = await userProfile.findOne({ user: req.user.id });
    
    if (!user) {
      return res.status(404).json({
        authenticated: false,
        message: "User not found"
      });
    }

    // ✅ Convert relative path to full URL
    let avatar = null;
    if (profile?.avatar) {
      if (profile.avatar.startsWith('http')) {
        avatar = profile.avatar; // Already full URL
      } else {
        const protocol = req.protocol;
        const host = req.get('host');
        avatar = `${protocol}://${host}${profile.avatar}`;
      }
    }

    res.json({
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        avatar: avatar, // ✅ FULL URL
        phone: profile?.phone || null,
        address: profile?.address || null,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({
      authenticated: false,
      message: "Server error"
    });
  }
});
router.put(
  "/profile/avatar",
  authMiddleware,
  avatarUpload.single("avatar"),
  updateAvatar
);

// User Profile & Account
router.get("/profile", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "Profile retrieved successfully",
    user: req.user,
  });
});

router.put("/profile", authMiddleware, updateProfile);

router.get("/dashboard", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "Dashboard accessed",
    user: req.user,
  });
});

// Password Management (Protected)
router.post("/change-password", authMiddleware, changePassword);

// Session Management
router.get("/sessions/me", authMiddleware, getMySessions);
router.post("/sessions/revoke/:sessionId", authMiddleware, revokeSession);

// Logout (Protected)
router.post("/logout",logout);

// ================= ADMIN ROUTES (Admin Authentication Required) =================

// Admin Session Management
router.get("/sessions/active", adminMiddleware, getActiveSessions);

// Admin User Management (Example endpoints - you can expand these)
router.get("/admin/users", adminMiddleware, async (req, res) => {
  try {
    const User = (await import("../models/usersmodels.js")).default;
    const users = await User.find({}).select("-password -otpHash -otpExpires");
    
    res.json({
      success: true,
      message: "Users retrieved successfully",
      users,
      count: users.length
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve users"
    });
  }
});

router.get("/admin/user/:userId", adminMiddleware, async (req, res) => {
  try {
    const User = (await import("../models/usersmodels.js")).default;
    const user = await User.findById(req.params.userId).select("-password -otpHash -otpExpires");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    res.json({
      success: true,
      message: "User retrieved successfully",
      user
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user"
    });
  }
});

router.put("/admin/user/:userId/status", adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const User = (await import("../models/usersmodels.js")).default;
    
    if (!["active", "suspended", "banned"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status },
      { new: true }
    ).select("-password -otpHash -otpExpires");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // If suspending or banning, invalidate all sessions
    if (status === "suspended" || status === "banned") {
      const { sessionManager } = await import("../utils/sessionManager.js");
      sessionManager.invalidateUserSessions(user._id.toString());
    }
    
    res.json({
      success: true,
      message: `User status updated to ${status}`,
      user
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status"
    });
  }
});

// ================= HEALTH CHECK =================
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Auth service is healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// ================= 404 HANDLER FOR AUTH ROUTES =================
// LAST LINE of authRoutes.js
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Auth endpoint not found",
    path: req.originalUrl,
    method: req.method,
  });
});



export default router;