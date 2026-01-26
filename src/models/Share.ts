import mysql from 'mysql2/promise';
import { getMySQLPool } from '../config/mysql';
import * as crypto from 'crypto';

export interface IShare {
  id?: number;
  meetingId: number;
  userId: number;
  token: string;
  password?: string;
  expiresAt?: Date;
  accessCount: number;
  maxAccess?: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ShareModel {
  /**
   * 创建分享
   */
  static async create(share: Omit<IShare, 'id' | 'token' | 'accessCount' | 'isActive' | 'createdAt' | 'updatedAt'>): Promise<IShare> {
    const pool = getMySQLPool();
    const token = crypto.randomBytes(32).toString('hex');
    
    const [result] = await pool.execute(
      `INSERT INTO shares 
       (meeting_id, user_id, token, password, expires_at, max_access, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        share.meetingId,
        share.userId,
        token,
        share.password || null,
        share.expiresAt || null,
        share.maxAccess || null,
        true,
      ]
    ) as any;

    return this.findById(result.insertId);
  }

  /**
   * 根据ID查找分享
   */
  static async findById(id: number): Promise<IShare | null> {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM shares WHERE id = ?',
      [id]
    ) as any[];

    if (rows.length === 0) return null;
    return this.mapRowToShare(rows[0]);
  }

  /**
   * 根据令牌查找分享
   */
  static async findByToken(token: string): Promise<IShare | null> {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM shares WHERE token = ? AND is_active = TRUE',
      [token]
    ) as any[];

    if (rows.length === 0) return null;
    return this.mapRowToShare(rows[0]);
  }

  /**
   * 增加访问次数
   */
  static async incrementAccess(id: number): Promise<void> {
    const pool = getMySQLPool();
    await pool.execute(
      'UPDATE shares SET access_count = access_count + 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * 更新分享
   */
  static async update(id: number, updates: Partial<IShare>): Promise<IShare | null> {
    const pool = getMySQLPool();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.password !== undefined) {
      fields.push('password = ?');
      values.push(updates.password);
    }
    if (updates.expiresAt !== undefined) {
      fields.push('expires_at = ?');
      values.push(updates.expiresAt);
    }
    if (updates.maxAccess !== undefined) {
      fields.push('max_access = ?');
      values.push(updates.maxAccess);
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await pool.execute(
      `UPDATE shares SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * 删除分享
   */
  static async delete(id: number): Promise<boolean> {
    const pool = getMySQLPool();
    const [result] = await pool.execute(
      'DELETE FROM shares WHERE id = ?',
      [id]
    ) as any;

    return result.affectedRows > 0;
  }

  /**
   * 将数据库行映射为分享对象
   */
  private static mapRowToShare(row: any): IShare {
    return {
      id: row.id,
      meetingId: row.meeting_id,
      userId: row.user_id,
      token: row.token,
      password: row.password,
      expiresAt: row.expires_at,
      accessCount: row.access_count,
      maxAccess: row.max_access,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
