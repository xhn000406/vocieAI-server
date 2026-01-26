import mysql from 'mysql2/promise';
import { initLogger } from './logger';

const logger = initLogger();

let pool: mysql.Pool | null = null;

export async function connectMySQL() {
  try {
    const dbConfig = {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'biji',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
    
    logger.info('🔌 正在连接 MySQL:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
    });
    
    pool = mysql.createPool(dbConfig);

    // 测试连接并验证数据库
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT DATABASE() as db, USER() as user') as any[];
    connection.release();
    
    logger.info('✅ MySQL 连接成功');
    logger.info('📊 当前数据库:', rows[0]?.db);
    logger.info('👤 当前用户:', rows[0]?.user);
  } catch (error) {
    logger.error('❌ MySQL 连接失败:', error);
    throw error;
  }
}

export function getMySQLPool() {
  if (!pool) {
    throw new Error('MySQL pool 未初始化');
  }
  return pool;
}

