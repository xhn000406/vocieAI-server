import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { MeetingModel } from '../models/Meeting';
import { TranscriptModel } from '../models/Transcript';

const router = Router();

// 获取会议列表
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId!);
    const { page, limit, search, tags, status } = req.query;

    const tagArray = tags ? (Array.isArray(tags) ? tags : [tags]) : undefined;

    const result = await MeetingModel.findByUserId(userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      tags: tagArray as string[],
      status: status as string,
    });

    res.json({
      success: true,
      data: {
        meetings: result.meetings,
        pagination: {
          page: Number(page) || 1,
          limit: Number(limit) || 20,
          total: result.total,
          pages: Math.ceil(result.total / (Number(limit) || 20)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取单个会议（包含转写内容）
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId!);
    const meetingId = parseInt(req.params.id);

    const meeting = await MeetingModel.findById(meetingId);
    if (!meeting || meeting.userId !== userId) {
      return res.status(404).json({ success: false, message: '会议不存在' });
    }

    // 获取转写内容
    const transcripts = await TranscriptModel.findByMeetingId(meetingId);
    meeting.transcript = transcripts;

    res.json({
      success: true,
      data: meeting,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建会议
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId!);
    const meeting = await MeetingModel.create({
      ...req.body,
      userId,
      startTime: req.body.startTime || new Date(),
    });

    res.status(201).json({
      success: true,
      data: meeting,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新会议
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId!);
    const meetingId = parseInt(req.params.id);

    const meeting = await MeetingModel.findById(meetingId);
    if (!meeting || meeting.userId !== userId) {
      return res.status(404).json({ success: false, message: '会议不存在' });
    }

    const updated = await MeetingModel.update(meetingId, req.body);
    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除会议
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId!);
    const meetingId = parseInt(req.params.id);

    const meeting = await MeetingModel.findById(meetingId);
    if (!meeting || meeting.userId !== userId) {
      return res.status(404).json({ success: false, message: '会议不存在' });
    }

    await MeetingModel.delete(meetingId);
    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
