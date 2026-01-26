import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/User';

const router = Router();

// 获取当前用户信息
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId!);
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 移除密码字段
    const { password, ...userWithoutPassword } = user;
    res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新用户信息
router.put('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId!);
    const { name, avatar, settings } = req.body;
    
    const user = await UserModel.update(userId, { name, avatar, settings });
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 移除密码字段
    const { password, ...userWithoutPassword } = user;
    res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
