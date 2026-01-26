import mysql from 'mysql2/promise';
import { getMySQLPool } from '../config/mysql';

export interface ITag {
  id?: number;
  userId: number;
  name: string;
  color?: string;
  icon?: string;
  usageCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TagModel {
  /**
   * 创建标签
   */
  static async create(tag: Omit<ITag, 'id' | 'createdAt' | 'updatedAt'>): Promise<ITag> {
    const pool = getMySQLPool();
    const [result] = await pool.execute(
      `INSERT INTO tags (user_id, name, color, icon, usage_count)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE usage_count = usage_count + 1`,
      [
        tag.userId,
        tag.name,
        tag.color || '#6366f1',
        tag.icon || null,
        tag.usageCount || 0,
      ]
    ) as any;

    return this.findById(result.insertId || await this.findByName(tag.userId, tag.name).then(t => t?.id));
  }

  /**
   * 根据ID查找标签
   */
  static async findById(id: number): Promise<ITag | null> {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM tags WHERE id = ?',
      [id]
    ) as any[];

    if (rows.length === 0) return null;
    return this.mapRowToTag(rows[0]);
  }

  /**
   * 根据用户ID和名称查找标签
   */
  static async findByName(userId: number, name: string): Promise<ITag | null> {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM tags WHERE user_id = ? AND name = ?',
      [userId, name]
    ) as any[];

    if (rows.length === 0) return null;
    return this.mapRowToTag(rows[0]);
  }

  /**
   * 根据用户ID查找所有标签
   */
  static async findByUserId(userId: number): Promise<ITag[]> {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM tags WHERE user_id = ? ORDER BY usage_count DESC, created_at DESC',
      [userId]
    ) as any[];

    return rows.map(row => this.mapRowToTag(row));
  }

  /**
   * 更新标签
   */
  static async update(id: number, updates: Partial<ITag>): Promise<ITag | null> {
    const pool = getMySQLPool();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.usageCount !== undefined) {
      fields.push('usage_count = ?');
      values.push(updates.usageCount);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await pool.execute(
      `UPDATE tags SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * 删除标签
   */
  static async delete(id: number): Promise<boolean> {
    const pool = getMySQLPool();
    const [result] = await pool.execute(
      'DELETE FROM tags WHERE id = ?',
      [id]
    ) as any;

    return result.affectedRows > 0;
  }

  /**
   * 将数据库行映射为标签对象
   */
  private static mapRowToTag(row: any): ITag {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      usageCount: row.usage_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
