import mysql from 'mysql2/promise';
import { getMySQLPool } from '../config/mysql';

export interface ITranscriptItem {
  id?: number;
  text: string;
  timestamp: number;
  speakerId?: string;
  speakerName?: string;
  isHighlighted?: boolean;
  confidence?: number;
}

export interface ITodoItem {
  text: string;
  assignee?: string;
  dueDate?: Date;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface IMeetingSummary {
  keywords: string[];
  summary: string;
  todos: ITodoItem[];
  actionItems?: string[];
  decisions?: string[];
  lastUpdated: Date;
}

export interface ISpeaker {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

export interface IParticipant {
  userId: string;
  name: string;
  role?: string;
}

export interface IMeeting {
  id?: number;
  userId: number;
  title: string;
  description?: string;
  duration: number;
  startTime: Date;
  endTime?: Date;
  audioUrl?: string;
  audioSize?: number;
  status: 'recording' | 'completed' | 'archived';
  summary?: IMeetingSummary;
  tags: string[];
  speakers?: ISpeaker[];
  participants?: IParticipant[];
  isArchived: boolean;
  isShared: boolean;
  shareToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MeetingModel {
  /**
   * 创建会议
   */
  static async create(meeting: Omit<IMeeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<IMeeting> {
    const pool = getMySQLPool();
    const [result] = await pool.execute(
      `INSERT INTO meetings 
       (user_id, title, description, duration, start_time, end_time, audio_url, audio_size,
        status, summary, tags, speakers, participants, is_archived, is_shared, share_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        meeting.userId,
        meeting.title,
        meeting.description || null,
        meeting.duration || 0,
        meeting.startTime,
        meeting.endTime || null,
        meeting.audioUrl || null,
        meeting.audioSize || null,
        meeting.status || 'completed',
        meeting.summary ? JSON.stringify(meeting.summary) : null,
        JSON.stringify(meeting.tags || []),
        JSON.stringify(meeting.speakers || []),
        JSON.stringify(meeting.participants || []),
        meeting.isArchived || false,
        meeting.isShared || false,
        meeting.shareToken || null,
      ]
    ) as any;

    const created = await this.findById(result.insertId);
    if (!created) {
      throw new Error('创建会议失败');
    }
    return created;
  }

  /**
   * 根据ID查找会议
   */
  static async findById(id: number): Promise<IMeeting | null> {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM meetings WHERE id = ?',
      [id]
    ) as any[];

    if (rows.length === 0) return null;
    return this.mapRowToMeeting(rows[0]);
  }

  /**
   * 根据用户ID查找会议列表
   */
  static async findByUserId(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      tags?: string[];
      search?: string;
    } = {}
  ): Promise<{ meetings: IMeeting[]; total: number }> {
    const pool = getMySQLPool();
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM meetings WHERE user_id = ?';
    const params: any[] = [userId];

    if (options.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }

    if (options.search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      const searchTerm = `%${options.search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (options.tags && options.tags.length > 0) {
      // MySQL JSON 查询标签
      const tagConditions = options.tags.map(() => 'JSON_CONTAINS(tags, ?)').join(' OR ');
      query += ` AND (${tagConditions})`;
      options.tags.forEach(tag => params.push(JSON.stringify(tag)));
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [meetings] = await pool.execute(query, params) as any[];

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM meetings WHERE user_id = ?';
    const countParams: any[] = [userId];

    if (options.status) {
      countQuery += ' AND status = ?';
      countParams.push(options.status);
    }

    if (options.search) {
      countQuery += ' AND (title LIKE ? OR description LIKE ?)';
      const searchTerm = `%${options.search}%`;
      countParams.push(searchTerm, searchTerm);
    }

    const [countRows] = await pool.execute(countQuery, countParams) as any[];
    const total = countRows[0].total;

    return {
      meetings: meetings.map((row: any) => this.mapRowToMeeting(row)),
      total,
    };
  }

  /**
   * 更新会议
   */
  static async update(id: number, updates: Partial<IMeeting>): Promise<IMeeting | null> {
    const pool = getMySQLPool();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.duration !== undefined) {
      fields.push('duration = ?');
      values.push(updates.duration);
    }
    if (updates.endTime !== undefined) {
      fields.push('end_time = ?');
      values.push(updates.endTime);
    }
    if (updates.audioUrl !== undefined) {
      fields.push('audio_url = ?');
      values.push(updates.audioUrl);
    }
    if (updates.audioSize !== undefined) {
      fields.push('audio_size = ?');
      values.push(updates.audioSize);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.summary !== undefined) {
      fields.push('summary = ?');
      values.push(JSON.stringify(updates.summary));
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.speakers !== undefined) {
      fields.push('speakers = ?');
      values.push(JSON.stringify(updates.speakers));
    }
    if (updates.participants !== undefined) {
      fields.push('participants = ?');
      values.push(JSON.stringify(updates.participants));
    }
    if (updates.isArchived !== undefined) {
      fields.push('is_archived = ?');
      values.push(updates.isArchived);
    }
    if (updates.isShared !== undefined) {
      fields.push('is_shared = ?');
      values.push(updates.isShared);
    }
    if (updates.shareToken !== undefined) {
      fields.push('share_token = ?');
      values.push(updates.shareToken);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await pool.execute(
      `UPDATE meetings SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * 删除会议
   */
  static async delete(id: number): Promise<boolean> {
    const pool = getMySQLPool();
    const [result] = await pool.execute(
      'DELETE FROM meetings WHERE id = ?',
      [id]
    ) as any;

    return result.affectedRows > 0;
  }

  /**
   * 根据分享令牌查找会议
   */
  static async findByShareToken(token: string): Promise<IMeeting | null> {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM meetings WHERE share_token = ? AND is_shared = TRUE',
      [token]
    ) as any[];

    if (rows.length === 0) return null;
    return this.mapRowToMeeting(rows[0]);
  }

  /**
   * 将数据库行映射为会议对象
   */
  private static mapRowToMeeting(row: any): IMeeting {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      duration: row.duration,
      startTime: row.start_time,
      endTime: row.end_time,
      audioUrl: row.audio_url,
      audioSize: row.audio_size ? Number(row.audio_size) : undefined,
      status: row.status,
      summary: row.summary ? JSON.parse(row.summary) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      speakers: row.speakers ? JSON.parse(row.speakers) : [],
      participants: row.participants ? JSON.parse(row.participants) : [],
      isArchived: Boolean(row.is_archived),
      isShared: Boolean(row.is_shared),
      shareToken: row.share_token,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
