/**
 * 检查数据库连接和表结构
 */
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { initLogger } from '../src/config/logger';

dotenv.config();
const logger = initLogger();

async function checkDatabase() {
  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'biji',
  };

  logger.info('🔍 检查数据库配置:', config);

  try {
    // 先连接到MySQL服务器（不指定数据库）检查数据库是否存在
    const checkConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });

    // 检查数据库是否存在
    const [databases] = await checkConnection.query(
      `SHOW DATABASES LIKE '${config.database.replace(/'/g, "''")}'`
    ) as any[];

    if (databases[0].length === 0) {
      logger.error(`❌ 数据库 "${config.database}" 不存在！`);
      logger.info('💡 请运行以下命令创建数据库:');
      logger.info(`   mysql -u ${config.user} -p < backend/src/database/mysql/schema.sql`);
      await checkConnection.end();
      return;
    } else {
      logger.info(`✅ 数据库 "${config.database}" 存在`);
    }
    await checkConnection.end();

    // 连接到目标数据库
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    });

    // 检查 users 表是否存在
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'users'"
    ) as any[];

    if (tables.length === 0) {
      logger.error('❌ users 表不存在！');
      logger.info('💡 请运行以下命令初始化数据库:');
      logger.info(`   mysql -u ${config.user} -p ${config.database} < backend/src/database/mysql/schema.sql`);
    } else {
      logger.info('✅ users 表存在');

      // 检查表结构
      const [columns] = await connection.execute(
        "SHOW COLUMNS FROM users"
      ) as any[];

      logger.info('📋 users 表结构:');
      columns.forEach((col: any) => {
        logger.info(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''}`);
      });

      // 检查表中的数据
      const [rows] = await connection.execute(
        "SELECT COUNT(*) as count FROM users"
      ) as any[];

      logger.info(`📊 users 表中的记录数: ${rows[0].count}`);

      if (rows[0].count > 0) {
        const [userRows] = await connection.execute(
          "SELECT id, email, name, created_at FROM users ORDER BY id DESC LIMIT 5"
        ) as any[];

        logger.info('👥 最近的用户记录:');
        userRows.forEach((user: any) => {
          logger.info(`   - ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Created: ${user.created_at}`);
        });
      }
    }

    await connection.end();
  } catch (error: any) {
    logger.error('❌ 检查数据库时出错:', error.message);
    logger.error('详细错误:', error);
    process.exit(1);
  }
}

checkDatabase();

