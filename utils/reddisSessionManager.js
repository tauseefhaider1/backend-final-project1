// utils/redisSessionManager.js (for production)
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';

class RedisSessionManager {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });
    
    this.prefix = 'session:';
  }

  async addSession(userId, token, req) {
    const decoded = jwt.decode(token);
    const sessionId = `${this.prefix}${userId}`;
    
    const sessionData = {
      userId,
      token,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      lastActive: new Date().toISOString(),
      userAgent: req?.headers['user-agent'] || 'Unknown',
      ipAddress: req?.ip || 'Unknown',
      isValid: true
    };

    // Store with TTL (time to live)
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    await this.redis.setex(
      sessionId, 
      ttl, 
      JSON.stringify(sessionData)
    );
    
    return sessionData;
  }

  async getSession(userId) {
    const sessionId = `${this.prefix}${userId}`;
    const data = await this.redis.get(sessionId);
    return data ? JSON.parse(data) : null;
  }

  async removeSession(userId) {
    const sessionId = `${this.prefix}${userId}`;
    return await this.redis.del(sessionId);
  }

  async isValidSession(userId) {
    const session = await this.getSession(userId);
    if (!session) return false;
    
    if (new Date(session.expiresAt) < new Date() || !session.isValid) {
      await this.removeSession(userId);
      return false;
    }
    
    // Update last active
    session.lastActive = new Date().toISOString();
    await this.addSession(userId, session.token, { 
      headers: { 'user-agent': session.userAgent },
      ip: session.ipAddress 
    });
    
    return true;
  }
}

export const redisSessionManager = new RedisSessionManager();