// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/usersmodels.js";
import { sessionManager } from "../utils/sessionManager.js";

const authMiddleware = async (req, res, next) => {
  try {    console.log("🧪 STEP 1 — Cookies received:", req.cookies); // 👈 ADD HERE

    // 1️⃣ Read token from httpOnly cookie
    const token = req.cookies?.token;
console.log("Cookies:", req.cookies);

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Not authenticated. Please login." 
      });
    }

    // 2️⃣ Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // 3️⃣ Check if session is active in session manager
    const isSessionValid = sessionManager.isValidSession(userId);
    
    if (!isSessionValid) {
      // Clear cookie and return error
      res.clearCookie("token", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      
      return res.status(401).json({ 
        success: false,
        message: "Session expired or invalid. Please login again." 
      });
    }

    // 4️⃣ Fetch user from database
    const user = await User.findById(userId).select("-password -__v");

    if (!user) {
      // Remove session if user doesn't exist
      sessionManager.removeSession(userId);
      res.clearCookie("token", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      
      return res.status(401).json({ 
        success: false,
        message: "User account not found." 
      });
    }

    // 5️⃣ Check if user is verified (email verification)
    if (!user.isVerified) {
      return res.status(403).json({ 
        success: false,
        message: "Please verify your email address to access this resource.",
        requiresVerification: true,
        email: user.email
      });
    }

    // 6️⃣ Check if account is locked (for failed login attempts)
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      return res.status(423).json({ 
        success: false,
        message: "Account temporarily locked. Try again later.",
        lockedUntil: user.accountLockedUntil
      });
    }

    // 7️⃣ Check if user is active (for soft deletion)
    if (user.status && user.status === "suspended") {
      return res.status(403).json({ 
        success: false,
        message: "Your account has been suspended. Contact support." 
      });
    }

    // 8️⃣ Update session last active time
    sessionManager.updateLastActive(userId);

    // 9️⃣ Attach user and token to request
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    };
    
    req.token = token;
    req.userId = user;

    next();
  } catch (error) {
    // Handle different JWT errors
    console.error("Auth middleware error:", error.message);

    // Clear invalid token cookie
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    let errorMessage = "Authentication failed";
    let errorType = "invalid_token";

    if (error.name === "TokenExpiredError") {
      errorMessage = "Your session has expired. Please login again.";
      errorType = "token_expired";
    } else if (error.name === "JsonWebTokenError") {
      errorMessage = "Invalid authentication token.";
      errorType = "invalid_token";
    } else if (error.name === "NotBeforeError") {
      errorMessage = "Token not yet active.";
      errorType = "token_not_active";
    }

    return res.status(401).json({
      success: false,
      message: errorMessage,
      error: errorType,
      timestamp: new Date().toISOString()
    });
  }
};

// Optional: Create a lighter middleware for routes that don't require full auth
export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Check session validity
    if (!sessionManager.isValidSession(userId)) {
      req.user = null;
      return next();
    }

    const user = await User.findById(userId).select("-password -__v");
    
    if (user && user.isVerified) {
      req.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      };
      req.token = token;
      req.userId = userId;
      
      // Update last active
      sessionManager.updateLastActive(userId);
    } else {
      req.user = null;
    }
  } catch (error) {
    // Silently fail for optional auth
    req.user = null;
  }
  
  next();
};
// Admin-only middleware (CLEAN)
export const adminMiddleware = (req, res, next) => {
  console.log("USER ROLE:", req.user?.role);

  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access denied",
    });
  }

  next();
};

export default authMiddleware;
