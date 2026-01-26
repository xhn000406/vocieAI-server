import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { MeetingModel } from '../models/Meeting';
import { TranscriptModel } from '../models/Transcript';
import { initLogger } from '../config/logger';

const logger = initLogger();

interface SocketAuth {
  userId?: string;
}

export function initSocketIO(io: Server) {
  io.use(async (socket: Socket & SocketAuth, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('未提供认证令牌'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('无效的认证令牌'));
    }
  });

  io.on('connection', (socket: Socket & SocketAuth) => {
    logger.info(`客户端连接: ${socket.id}, 用户ID: ${socket.userId}`);

    // 加入用户专属房间
    socket.join(`user:${socket.userId}`);

    // 加入会议房间
    socket.on('join-meeting', async (meetingId: string) => {
      try {
        const userId = parseInt(socket.userId!);
        const meeting = await MeetingModel.findById(parseInt(meetingId));

        if (meeting && meeting.userId === userId) {
          socket.join(`meeting:${meetingId}`);
          socket.emit('joined-meeting', { meetingId });
        } else {
          socket.emit('error', { message: '会议不存在' });
        }
      } catch (error) {
        socket.emit('error', { message: '加入会议失败' });
      }
    });

    // 离开会议房间
    socket.on('leave-meeting', (meetingId: string) => {
      socket.leave(`meeting:${meetingId}`);
    });

    // 接收实时转写
    socket.on('transcript', async (data: { meetingId: string; text: string; timestamp: number }) => {
      try {
        const userId = parseInt(socket.userId!);
        const meetingId = parseInt(data.meetingId);
        const meeting = await MeetingModel.findById(meetingId);

        if (meeting && meeting.userId === userId) {
          const transcript = await TranscriptModel.create(meetingId, {
            text: data.text,
            timestamp: data.timestamp,
            isHighlighted: false,
          });

          // 获取所有转写内容
          const transcripts = await TranscriptModel.findByMeetingId(meetingId);

          // 广播给会议房间内的所有客户端
          io.to(`meeting:${data.meetingId}`).emit('transcript-update', {
            meetingId: data.meetingId,
            transcript: transcripts,
          });
        }
      } catch (error) {
        socket.emit('error', { message: '保存转写失败' });
      }
    });

    // 接收AI总结
    socket.on('summary', async (data: { meetingId: string; summary: any }) => {
      try {
        const userId = parseInt(socket.userId!);
        const meetingId = parseInt(data.meetingId);
        const meeting = await MeetingModel.findById(meetingId);

        if (meeting && meeting.userId === userId) {
          await MeetingModel.update(meetingId, {
            summary: {
              ...data.summary,
              lastUpdated: new Date(),
            },
          });

          const updated = await MeetingModel.findById(meetingId);
          io.to(`meeting:${data.meetingId}`).emit('summary-update', {
            meetingId: data.meetingId,
            summary: updated?.summary,
          });
        }
      } catch (error) {
        socket.emit('error', { message: '保存总结失败' });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`客户端断开: ${socket.id}`);
    });
  });
}
