/**
 * 测试直接插入用户数据
 */
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { initLogger } from '../src/config/logger';

dotenv.config();
const logger = initLogger();

async function testInsert() {
  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'biji',
  };

  try {
    const connection = await mysql.createConnection(config);
    
    logger.info('🔍 测试数据库连接...');
    const [dbRows] = await connection.execute('SELECT DATABASE() as db') as any[];
    logger.info('📊 当前数据库:', dbRows[0]?.db);

    // 测试插入
    const testEmail = `test_${Date.now()}@test.com`;
    const testPassword = await bcrypt.hash('123456', 10);
    const testName = '测试用户';
    
    logger.info('📝 准备插入测试用户:', { email: testEmail, name: testName });

    const [result] = await connection.execute(
      `INSERT INTO users 
       (email, password, name, subscription, storage_used, storage_limit, settings)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        testEmail,
        testPassword,
        testName,
        'free',
        0,
        1073741824,
        JSON.stringify({
          language: 'zh-CN',
          theme: 'auto',
          notifications: true,
        }),
      ]
    ) as any;

    logger.info('✅ INSERT 执行结果:', {
      insertId: result.insertId,
      affectedRows: result.affectedRows,
      warningCount: result.warningCount,
    });

    // 立即查询验证
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE id = ?',
      [result.insertId]
    ) as any[];

    if (rows.length > 0) {
      logger.info('✅ 查询到新插入的用户:', {
        id: rows[0].id,
        email: rows[0].email,
        name: rows[0].name,
      });
    } else {
      logger.error('❌ 无法查询到新插入的用户！');
    }

    // 统计总数
    const [countRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM users'
    ) as any[];
    logger.info('📊 users 表中的总记录数:', countRows[0].count);

    await connection.end();
  } catch (error: any) {
    logger.error('❌ 测试插入时出错:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
    });
    process.exit(1);
  }
}

testInsert();

