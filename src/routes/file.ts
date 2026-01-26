import { Router } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadFile, getFileUrl, deleteFile } from '../services/storage';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// 上传文件
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '未提供文件' });
    }

    const fileUrl = await uploadFile(req.file, req.userId!);

    res.json({
      success: true,
      data: { url: fileUrl },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取文件URL
router.get('/:fileId', authenticate, async (req: AuthRequest, res) => {
  try {
    const url = await getFileUrl(req.params.fileId);
    res.json({
      success: true,
      data: { url },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除文件
router.delete('/:fileId', authenticate, async (req: AuthRequest, res) => {
  try {
    await deleteFile(req.params.fileId);
    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

