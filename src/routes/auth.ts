import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// 注册
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('无效的邮箱地址'),
    body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
    body('name').notEmpty().withMessage('用户名不能为空'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password, name } = req.body;

      // 检查用户是否已存在
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, message: '用户已存在' });
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 创建用户
      console.log('🚀 开始创建用户:', { email: email.toLowerCase(), name });
      const user = await UserModel.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        subscription: 'free',
        storageUsed: 0,
        storageLimit: 1073741824, // 1GB
        settings: {
          language: 'zh-CN',
          theme: 'auto',
          notifications: true,
        },
      });
      console.log('✅ 用户创建完成:', { id: user.id, email: user.email });

      // 生成 token
      const token = jwt.sign(
        { userId: user.id.toString() },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            subscription: user.subscription,
          },
          token,
        },
      });
    } catch (error: any) {
      console.error('注册错误:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || '注册失败，请稍后重试',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// 登录
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('无效的邮箱地址'),
    body('password').notEmpty().withMessage('密码不能为空'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password } = req.body;

      // 查找用户
      const user = await UserModel.findByEmail(email.toLowerCase());
      if (!user || !user.password) {
        return res.status(401).json({ success: false, message: '邮箱或密码错误' });
      }

      // 验证密码
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ success: false, message: '邮箱或密码错误' });
      }

      // 生成 token
      const token = jwt.sign(
        { userId: user.id.toString() },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            subscription: user.subscription,
            avatar: user.avatar,
          },
          token,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// 登出
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      // 将 token 加入黑名单（存储在 Redis）
      const { getRedisClient } = await import('../config/redis');
      const redis = getRedisClient();
      const decoded = jwt.decode(token) as { exp?: number };
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        await redis.setEx(`blacklist:${token}`, ttl, '1');
      }
    }
    res.json({ success: true, message: '登出成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// OAuth 登录（待实现）
router.post('/oauth/google', async (req, res) => {
  res.status(501).json({ success: false, message: 'Google OAuth 待实现' });
});

router.post('/oauth/apple', async (req, res) => {
  res.status(501).json({ success: false, message: 'Apple OAuth 待实现' });
});

router.post('/oauth/wechat', async (req, res) => {
  res.status(501).json({ success: false, message: '微信 OAuth 待实现' });
});

export default router;
