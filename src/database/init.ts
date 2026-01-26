/**
 * 数据库初始化脚本
 * 用于初始化 MongoDB 和 MySQL 数据库
 */

import { connectMySQL } from '../config/mysql';
import { initLogger } from '../config/logger';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const logger = initLogger();

/**
 * 初始化 MySQL 数据库
 */
export async function initMySQL() {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
    });

    // 读取并执行 SQL 脚本
    const sqlPath = path.join(__dirname, 'mysql', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // 分割 SQL 语句（按分号分割）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        await pool.execute(statement);
      }
    }

    await pool.end();
    logger.info('✅ MySQL 数据库初始化完成');
  } catch (error) {
    logger.error('❌ MySQL 数据库初始化失败:', error);
    throw error;
  }
}

/**
 * 初始化所有数据库
 */
export async function initDatabases() {
  try {
    await connectMySQL();
    await initMySQL();
    logger.info('✅ 所有数据库初始化完成');
  } catch (error) {
    logger.error('❌ 数据库初始化失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，执行初始化
if (require.main === module) {
  initDatabases()
    .then(() => {
      logger.info('数据库初始化成功');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('数据库初始化失败:', error);
      process.exit(1);
    });
}

