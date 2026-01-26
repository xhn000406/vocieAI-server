import mysql from 'mysql2/promise';
import { getMySQLPool } from '../../config/mysql';

/**
 * MySQL 数据模型操作类
 */

export class UserStatsModel {
  /**
   * 创建或更新用户统计
   */
  static async upsert(userId: number, data: {
    totalMeetings?: number;
    totalDuration?: number;
    totalStorage?: number;
    lastMeetingAt?: Date;
  }) {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      `INSERT INTO user_stats (user_id, total_meetings, total_duration, total_storage, last_meeting_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       total_meetings = COALESCE(?, total_meetings),
       total_duration = COALESCE(?, total_duration),
       total_storage = COALESCE(?, total_storage),
       last_meeting_at = COALESCE(?, last_meeting_at)`,
      [
        userId,
        data.totalMeetings || 0,
        data.totalDuration || 0,
        data.totalStorage || 0,
        data.lastMeetingAt || null,
        data.totalMeetings,
        data.totalDuration,
        data.totalStorage,
        data.lastMeetingAt,
      ]
    );
    return rows;
  }

  /**
   * 获取用户统计
   */
  static async getByUserId(userId: number) {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM user_stats WHERE user_id = ?',
      [userId]
    );
    return (rows as any[])[0];
  }
}

export class MeetingStatsModel {
  /**
   * 创建或更新会议统计
   */
  static async upsert(meetingId: number, userId: number, data: {
    transcriptCount?: number;
    transcriptLength?: number;
    keywordCount?: number;
    todoCount?: number;
    completedTodoCount?: number;
    speakerCount?: number;
  }) {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      `INSERT INTO meeting_stats 
       (meeting_id, user_id, transcript_count, transcript_length, keyword_count, todo_count, completed_todo_count, speaker_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       transcript_count = COALESCE(?, transcript_count),
       transcript_length = COALESCE(?, transcript_length),
       keyword_count = COALESCE(?, keyword_count),
       todo_count = COALESCE(?, todo_count),
       completed_todo_count = COALESCE(?, completed_todo_count),
       speaker_count = COALESCE(?, speaker_count)`,
      [
        meetingId,
        userId,
        data.transcriptCount || 0,
        data.transcriptLength || 0,
        data.keywordCount || 0,
        data.todoCount || 0,
        data.completedTodoCount || 0,
        data.speakerCount || 0,
        data.transcriptCount,
        data.transcriptLength,
        data.keywordCount,
        data.todoCount,
        data.completedTodoCount,
        data.speakerCount,
      ]
    );
    return rows;
  }

  /**
   * 获取会议统计
   */
  static async getByMeetingId(meetingId: number) {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM meeting_stats WHERE meeting_id = ?',
      [meetingId]
    );
    return (rows as any[])[0];
  }
}

export class SystemLogModel {
  /**
   * 创建系统日志
   */
  static async create(data: {
    userId?: number;
    action: string;
    resourceType?: string;
    resourceId?: number;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
  }) {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      `INSERT INTO system_logs 
       (user_id, action, resource_type, resource_id, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId || null,
        data.action,
        data.resourceType || null,
        data.resourceId || null,
        data.ipAddress || null,
        data.userAgent || null,
        data.details ? JSON.stringify(data.details) : null,
      ]
    );
    return rows;
  }
}

export class SubscriptionModel {
  /**
   * 创建订阅记录
   */
  static async create(data: {
    userId: number;
    planType: 'free' | 'pro';
    provider?: string;
    transactionId?: string;
    amount?: number;
    currency?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      `INSERT INTO subscriptions 
       (user_id, plan_type, provider, transaction_id, amount, currency, status, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId,
        data.planType,
        data.provider || null,
        data.transactionId || null,
        data.amount || null,
        data.currency || 'CNY',
        data.status || 'pending',
        data.startDate || null,
        data.endDate || null,
      ]
    );
    return rows;
  }

  /**
   * 获取用户当前订阅
   */
  static async getCurrentSubscription(userId: number) {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      `SELECT * FROM subscriptions 
       WHERE user_id = ? AND status = 'success' 
       ORDER BY end_date DESC LIMIT 1`,
      [userId]
    );
    return (rows as any[])[0];
  }
}

export class ApiCallModel {
  /**
   * 创建API调用记录
   */
  static async create(data: {
    userId?: number;
    apiType: string;
    endpoint: string;
    method: string;
    statusCode?: number;
    responseTime?: number;
    cost?: number;
    errorMessage?: string;
  }) {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      `INSERT INTO api_calls 
       (user_id, api_type, endpoint, method, status_code, response_time, cost, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId || null,
        data.apiType,
        data.endpoint,
        data.method,
        data.statusCode || null,
        data.responseTime || null,
        data.cost || null,
        data.errorMessage || null,
      ]
    );
    return rows;
  }
}
