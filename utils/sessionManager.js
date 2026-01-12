// utils/sessionManager.js
import jwt from "jsonwebtoken";

class SessionManager {
  constructor() {
    this.activeSessions = new Map();
  }

  addSession(userId, token, req) {
    const decoded = jwt.decode(token);
    
    const sessionData = {
      userId,
      token,
      expiresAt: new Date(decoded.exp * 1000),
      lastActive: new Date(),
      userAgent: req?.headers['user-agent']?.substring(0, 200) || 'Unknown',
      ipAddress: req?.ip || req?.connection?.remoteAddress || 'Unknown',
      isValid: true,
      createdAt: new Date()
    };

    this.activeSessions.set(userId.toString(), sessionData);
    return sessionData;
  }

  removeSession(userId) {
    return this.activeSessions.delete(userId.toString());
  }

  isValidSession(userId) {
    const session = this.activeSessions.get(userId.toString());
    
    if (!session) return false;
    
    // Check if session is expired
    if (session.expiresAt < new Date()) {
      this.removeSession(userId);
      return false;
    }
    
    // Check if session is manually invalidated
    if (!session.isValid) {
      this.removeSession(userId);
      return false;
    }
    
    return true;
  }

  updateLastActive(userId) {
    const session = this.activeSessions.get(userId.toString());
    if (session) {
      session.lastActive = new Date();
    }
  }

  getUserSessions(userId) {
    const session = this.activeSessions.get(userId.toString());
    return session ? [session] : [];
  }

  invalidateUserSessions(userId) {
    return this.removeSession(userId);
  }

  getAllSessions() {
    return Array.from(this.activeSessions.entries()).map(([userId, session]) => ({
      userId,
      ...session
    }));
  }

  // Cleanup expired sessions
  cleanup() {
    const now = new Date();
    let count = 0;
    
    for (const [userId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now) {
        this.activeSessions.delete(userId);
        count++;
      }
    }
    
    return count;
  }
}

export const sessionManager = new SessionManager();

// Run cleanup every 15 minutes
setInterval(() => {
  const cleaned = sessionManager.cleanup();
  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} expired sessions`);
  }
}, 15 * 60 * 1000);