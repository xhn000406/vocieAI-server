import mysql from 'mysql2/promise';
import { getMySQLPool } from '../config/mysql';

export interface IFile {
  id?: number;
  userId: number;
  meetingId?: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  storageType: 'minio' | 's3';
  storageKey: string;
  isPublic: boolean;
  createdAt?: Date;
}

export class FileModel {
  /**
   * 创建文件记录
   */
  static async create(file: Omit<IFile, 'id' | 'createdAt'>): Promise<IFile> {
    const pool = getMySQLPool();
    const [result] = await pool.execute(
      `INSERT INTO files 
       (user_id, meeting_id, filename, original_name, mime_type, size, url, storage_type, storage_key, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        file.userId,
        file.meetingId || null,
        file.filename,
        file.originalName,
        file.mimeType,
        file.size,
        file.url,
        file.storageType,
        file.storageKey,
        file.isPublic || false,
      ]
    ) as any;

    return this.findById(result.insertId);
  }

  /**
   * 根据ID查找文件
   */
  static async findById(id: number): Promise<IFile | null> {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM files WHERE id = ?',
      [id]
    ) as any[];

    if (rows.length === 0) return null;
    return this.mapRowToFile(rows[0]);
  }

  /**
   * 根据用户ID查找文件列表
   */
  static async findByUserId(userId: number): Promise<IFile[]> {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    ) as any[];

    return rows.map(row => this.mapRowToFile(row));
  }

  /**
   * 根据会议ID查找文件列表
   */
  static async findByMeetingId(meetingId: number): Promise<IFile[]> {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM files WHERE meeting_id = ? ORDER BY created_at DESC',
      [meetingId]
    ) as any[];

    return rows.map(row => this.mapRowToFile(row));
  }

  /**
   * 删除文件记录
   */
  static async delete(id: number): Promise<boolean> {
    const pool = getMySQLPool();
    const [result] = await pool.execute(
      'DELETE FROM files WHERE id = ?',
      [id]
    ) as any;

    return result.affectedRows > 0;
  }

  /**
   * 将数据库行映射为文件对象
   */
  private static mapRowToFile(row: any): IFile {
    return {
      id: row.id,
      userId: row.user_id,
      meetingId: row.meeting_id,
      filename: row.filename,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: Number(row.size),
      url: row.url,
      storageType: row.storage_type,
      storageKey: row.storage_key,
      isPublic: Boolean(row.is_public),
      createdAt: row.created_at,
    };
  }
}
