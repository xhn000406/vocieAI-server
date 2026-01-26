import mysql from 'mysql2/promise';
import { getMySQLPool } from '../config/mysql';
import { ITranscriptItem } from './Meeting';

export class TranscriptModel {
  /**
   * 创建转写内容
   */
  static async create(meetingId: number, transcript: ITranscriptItem): Promise<ITranscriptItem> {
    const pool = getMySQLPool();
    const [result] = await pool.execute(
      `INSERT INTO transcripts 
       (meeting_id, text, timestamp, speaker_id, speaker_name, is_highlighted, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        meetingId,
        transcript.text,
        transcript.timestamp,
        transcript.speakerId || null,
        transcript.speakerName || null,
        transcript.isHighlighted || false,
        transcript.confidence || null,
      ]
    ) as any;

    return this.findById(result.insertId);
  }

  /**
   * 根据ID查找转写内容
   */
  static async findById(id: number): Promise<ITranscriptItem | null> {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM transcripts WHERE id = ?',
      [id]
    ) as any[];

    if (rows.length === 0) return null;
    return this.mapRowToTranscript(rows[0]);
  }

  /**
   * 根据会议ID查找所有转写内容
   */
  static async findByMeetingId(meetingId: number): Promise<ITranscriptItem[]> {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM transcripts WHERE meeting_id = ? ORDER BY timestamp ASC',
      [meetingId]
    ) as any[];

    return rows.map(row => this.mapRowToTranscript(row));
  }

  /**
   * 更新转写内容
   */
  static async update(id: number, updates: Partial<ITranscriptItem>): Promise<ITranscriptItem | null> {
    const pool = getMySQLPool();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.text !== undefined) {
      fields.push('text = ?');
      values.push(updates.text);
    }
    if (updates.timestamp !== undefined) {
      fields.push('timestamp = ?');
      values.push(updates.timestamp);
    }
    if (updates.speakerId !== undefined) {
      fields.push('speaker_id = ?');
      values.push(updates.speakerId);
    }
    if (updates.speakerName !== undefined) {
      fields.push('speaker_name = ?');
      values.push(updates.speakerName);
    }
    if (updates.isHighlighted !== undefined) {
      fields.push('is_highlighted = ?');
      values.push(updates.isHighlighted);
    }
    if (updates.confidence !== undefined) {
      fields.push('confidence = ?');
      values.push(updates.confidence);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await pool.execute(
      `UPDATE transcripts SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * 删除转写内容
   */
  static async delete(id: number): Promise<boolean> {
    const pool = getMySQLPool();
    const [result] = await pool.execute(
      'DELETE FROM transcripts WHERE id = ?',
      [id]
    ) as any;

    return result.affectedRows > 0;
  }

  /**
   * 将数据库行映射为转写对象
   */
  private static mapRowToTranscript(row: any): ITranscriptItem {
    return {
      id: row.id,
      text: row.text,
      timestamp: row.timestamp,
      speakerId: row.speaker_id,
      speakerName: row.speaker_name,
      isHighlighted: Boolean(row.is_highlighted),
      confidence: row.confidence ? Number(row.confidence) : undefined,
    };
  }
}

