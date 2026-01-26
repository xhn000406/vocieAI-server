import mysql from 'mysql2/promise';
import { getMySQLPool } from '../config/mysql';

export interface IUserOAuth {
  google?: {
    id: string;
    email: string;
  };
  apple?: {
    id: string;
    email: string;
  };
  wechat?: {
    openid: string;
    unionid?: string;
  };
}

export interface IUserSettings {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
}

export interface IUser {
  id: number;
  email: string;
  password?: string;
  name: string;
  avatar?: string;
  phone?: string;
  subscription: 'free' | 'pro';
  subscriptionExpiresAt?: Date;
  lastSyncAt?: Date;
  storageUsed: number;
  storageLimit: number;
  settings: IUserSettings;
  oauth?: IUserOAuth;
  createdAt: Date;
  updatedAt: Date;
}

export class UserModel {
  /**
   * 创建用户
   */
  static async create(user: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
    const pool = getMySQLPool();
    
    // 记录当前使用的数据库
    try {
      const [dbRows] = await pool.execute('SELECT DATABASE() as db') as any[];
      console.log('📊 [UserModel.create] 当前使用的数据库:', dbRows[0]?.db);
    } catch (dbError) {
      console.warn('⚠️ [UserModel.create] 无法查询当前数据库:', dbError);
    }
    
    const settingsJson = JSON.stringify(user.settings || {
      language: 'zh-CN',
      theme: 'auto',
      notifications: true,
    });
    
    console.log('📝 [UserModel.create] 准备插入用户数据:', {
      email: user.email,
      name: user.name,
      subscription: user.subscription,
    });
    
    try {
      const [result] = await pool.execute(
        `INSERT INTO users 
         (email, password, name, avatar, phone, subscription, subscription_expires_at, 
          last_sync_at, storage_used, storage_limit, settings, oauth)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.email,
          user.password || null,
          user.name,
          user.avatar || null,
          user.phone || null,
          user.subscription,
          user.subscriptionExpiresAt || null,
          user.lastSyncAt || null,
          user.storageUsed || 0,
          user.storageLimit || 1073741824,
          settingsJson,
          user.oauth ? JSON.stringify(user.oauth) : null,
        ]
      ) as any;

      console.log('✅ [UserModel.create] INSERT 执行结果:', {
        insertId: result.insertId,
        affectedRows: result.affectedRows,
        warningCount: result.warningCount,
      });

      const insertId = result.insertId;
      if (!insertId) {
        console.error('❌ [UserModel.create] INSERT 操作未返回 insertId');
        throw new Error('创建用户失败：无法获取插入ID');
      }

      // 等待一小段时间确保数据已提交（虽然应该是立即的）
      await new Promise(resolve => setTimeout(resolve, 100));

      const createdUser = await this.findById(insertId);
      if (!createdUser) {
        console.error('❌ [UserModel.create] 无法查询到新创建的用户，insertId:', insertId);
        
        // 再次尝试查询
        const [checkRows] = await pool.execute(
          'SELECT * FROM users WHERE id = ?',
          [insertId]
        ) as any[];
        console.log('🔍 [UserModel.create] 直接查询结果:', checkRows);
        
        // 查询所有用户看看是否有数据
        const [allUsers] = await pool.execute('SELECT id, email, name FROM users LIMIT 5') as any[];
        console.log('🔍 [UserModel.create] 当前users表中的所有用户:', allUsers);
        
        throw new Error('创建用户失败：无法查询到新创建的用户');
      }

      console.log('✅ [UserModel.create] 用户创建成功:', {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
      });

      return createdUser;
    } catch (error: any) {
      console.error('❌ [UserModel.create] 创建用户时发生错误:', {
        message: error.message,
        code: error.code,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 根据ID查找用户
   */
  static async findById(id: number): Promise<IUser | null> {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    ) as any[];

    if (rows.length === 0) return null;
    return this.mapRowToUser(rows[0]);
  }

  /**
   * 根据邮箱查找用户
   */
  static async findByEmail(email: string): Promise<IUser | null> {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    ) as any[];

    if (rows.length === 0) return null;
    return this.mapRowToUser(rows[0]);
  }

  /**
   * 更新用户
   */
  static async update(id: number, updates: Partial<IUser>): Promise<IUser | null> {
    const pool = getMySQLPool();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.password !== undefined) {
      fields.push('password = ?');
      values.push(updates.password);
    }
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(updates.avatar);
    }
    if (updates.phone !== undefined) {
      fields.push('phone = ?');
      values.push(updates.phone);
    }
    if (updates.subscription !== undefined) {
      fields.push('subscription = ?');
      values.push(updates.subscription);
    }
    if (updates.subscriptionExpiresAt !== undefined) {
      fields.push('subscription_expires_at = ?');
      values.push(updates.subscriptionExpiresAt);
    }
    if (updates.lastSyncAt !== undefined) {
      fields.push('last_sync_at = ?');
      values.push(updates.lastSyncAt);
    }
    if (updates.storageUsed !== undefined) {
      fields.push('storage_used = ?');
      values.push(updates.storageUsed);
    }
    if (updates.storageLimit !== undefined) {
      fields.push('storage_limit = ?');
      values.push(updates.storageLimit);
    }
    if (updates.settings !== undefined) {
      fields.push('settings = ?');
      values.push(JSON.stringify(updates.settings));
    }
    if (updates.oauth !== undefined) {
      fields.push('oauth = ?');
      values.push(JSON.stringify(updates.oauth));
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * 删除用户
   */
  static async delete(id: number): Promise<boolean> {
    const pool = getMySQLPool();
    const [result] = await pool.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    ) as any;

    return result.affectedRows > 0;
  }

  /**
   * 将数据库行映射为用户对象
   */
  private static mapRowToUser(row: any): IUser {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
      avatar: row.avatar,
      phone: row.phone,
      subscription: row.subscription,
      subscriptionExpiresAt: row.subscription_expires_at,
      lastSyncAt: row.last_sync_at,
      storageUsed: Number(row.storage_used),
      storageLimit: Number(row.storage_limit),
      settings: row.settings ? JSON.parse(row.settings) : {
        language: 'zh-CN',
        theme: 'auto',
        notifications: true,
      },
      oauth: row.oauth ? JSON.parse(row.oauth) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
