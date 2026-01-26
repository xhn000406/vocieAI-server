import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { MeetingModel } from '../models/Meeting';
import { TranscriptModel } from '../models/Transcript';

const router = Router();

// 添加转写内容
router.post('/:meetingId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId!);
    const meetingId = parseInt(req.params.meetingId);
    const { text, timestamp, speakerId, speakerName } = req.body;

    const meeting = await MeetingModel.findById(meetingId);
    if (!meeting || meeting.userId !== userId) {
      return res.status(404).json({ success: false, message: '会议不存在' });
    }

    const transcript = await TranscriptModel.create(meetingId, {
      text,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      speakerId,
      speakerName,
      isHighlighted: false,
    });

    res.json({
      success: true,
      data: transcript,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新转写内容
router.put('/:meetingId/:transcriptId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId!);
    const meetingId = parseInt(req.params.meetingId);
    const transcriptId = parseInt(req.params.transcriptId);

    const meeting = await MeetingModel.findById(meetingId);
    if (!meeting || meeting.userId !== userId) {
      return res.status(404).json({ success: false, message: '会议不存在' });
    }

    const transcript = await TranscriptModel.update(transcriptId, req.body);
    if (!transcript) {
      return res.status(404).json({ success: false, message: '转写内容不存在' });
    }

    res.json({
      success: true,
      data: transcript,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
