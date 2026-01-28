/**
 * 检查数据库连接和表结构（使用 Prisma）
 */
import dotenv from 'dotenv';
import { prisma } from '../lib/prisma';
import { initLogger } from '../src/config/logger';

dotenv.config();
const logger = initLogger();

async function checkDatabase() {
  logger.info('🔍 检查数据库连接...');

  try {
    // 测试数据库连接
    await prisma.$connect();
    logger.info('✅ 数据库连接成功');

    // 检查 users 表是否存在（通过查询表结构）
    try {
      const userCount = await prisma.users.count();
      logger.info('✅ users 表存在');

      // 获取表结构信息（通过查询一个示例记录）
      const sampleUser = await prisma.users.findFirst();
      if (sampleUser) {
        logger.info('📋 users 表结构示例:');
        logger.info(`   - id: Int (主键)`);
        logger.info(`   - email: String (唯一)`);
        logger.info(`   - password: String?`);
        logger.info(`   - name: String`);
        logger.info(`   - subscription: Enum (free, pro)`);
        logger.info(`   - storage_used: BigInt`);
        logger.info(`   - storage_limit: BigInt`);
        logger.info(`   - created_at: DateTime`);
        logger.info(`   - updated_at: DateTime`);
      }

      logger.info(`📊 users 表中的记录数: ${userCount}`);

      if (userCount > 0) {
        const recentUsers = await prisma.users.findMany({
          take: 5,
          orderBy: { id: 'desc' },
          select: {
            id: true,
            email: true,
            name: true,
            created_at: true,
          },
        });

        logger.info('👥 最近的用户记录:');
        recentUsers.forEach((user) => {
          logger.info(`   - ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Created: ${user.created_at}`);
        });
      }
    } catch (error: any) {
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        logger.error('❌ users 表不存在！');
        logger.info('💡 请运行以下命令初始化数据库:');
        logger.info('   npm run prisma:migrate');
        logger.info('   或');
        logger.info('   npx prisma migrate dev');
      } else {
        throw error;
      }
    }

    await prisma.$disconnect();
  } catch (error: any) {
    logger.error('❌ 检查数据库时出错:', error.message);
    logger.error('详细错误:', error);
    
    if (error.code === 'P1001') {
      logger.error('💡 无法连接到数据库，请检查 DATABASE_URL 环境变量');
    }
    
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

checkDatabase();

