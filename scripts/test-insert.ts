/**
 * 测试直接插入用户数据（使用 Prisma）
 */
import dotenv from 'dotenv';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { initLogger } from '../src/config/logger';

dotenv.config();
const logger = initLogger();

async function testInsert() {
  try {
    logger.info('🔍 测试数据库连接...');
    await prisma.$connect();
    logger.info('✅ 数据库连接成功');

    // 测试插入
    const testEmail = `test_${Date.now()}@test.com`;
    const testPassword = await bcrypt.hash('123456', 10);
    const testName = '测试用户';
    
    logger.info('📝 准备插入测试用户:', { email: testEmail, name: testName });

    const newUser = await prisma.users.create({
      data: {
        email: testEmail,
        password: testPassword,
        name: testName,
        subscription: 'free',
        storage_used: BigInt(0),
        storage_limit: BigInt(1073741824),
      },
    });

    logger.info('✅ INSERT 执行结果:', {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      subscription: newUser.subscription,
    });

    // 立即查询验证
    const user = await prisma.users.findUnique({
      where: { id: newUser.id },
    });

    if (user) {
      logger.info('✅ 查询到新插入的用户:', {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
      });
    } else {
      logger.error('❌ 无法查询到新插入的用户！');
    }

    // 统计总数
    const count = await prisma.users.count();
    logger.info('📊 users 表中的总记录数:', count);

    await prisma.$disconnect();
  } catch (error: any) {
    logger.error('❌ 测试插入时出错:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    
    if (error.code === 'P2002') {
      logger.error('💡 唯一约束冲突，可能是 email 已存在');
    }
    
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

testInsert();

