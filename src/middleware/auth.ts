import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getRedisClient } from '../config/redis';

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, message: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
    
    // 检查 Redis 中是否有此 token（用于登出功能）
    try {
      const redis = getRedisClient();
      const isBlacklisted = await redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({ success: false, message: '令牌已失效' });
      }
    } catch (error) {
      // Redis 连接失败时继续（开发环境可能未启动Redis）
      console.warn('Redis连接失败，跳过token黑名单检查');
    }

    req.userId = decoded.userId.toString();
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '无效的认证令牌' });
  }
}
