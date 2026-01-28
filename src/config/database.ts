/**
 * Prisma 数据库客户端配置
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { initLogger } from './logger';

// 延迟初始化 logger 和 prisma，避免在模块导入时执行
let logger: ReturnType<typeof initLogger> | null = null;
let prisma: PrismaClient | null = null;

/**
 * 获取 logger 实例（延迟初始化）
 */
function getLogger() {
  if (!logger) {
    logger = initLogger();
  }
  return logger;
}

/**
 * Prisma 客户端配置
 * Prisma 7+ 会自动从环境变量 DATABASE_URL 或 prisma.config.ts 读取数据库连接信息
 */
function getPrismaClientOptions() {
  return {
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  };
}

/**
 * 获取 Prisma 客户端实例（延迟初始化）
 * Prisma 7+ 会自动从环境变量 DATABASE_URL 或 prisma.config.ts 读取数据库连接信息
 * 注意：PrismaClient 的创建是同步的，不会阻塞，但连接数据库是异步的
 */
function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const options = getPrismaClientOptions();
    prisma = new PrismaClient(options);
  }
  return prisma;
}

/**
 * 连接数据库（带超时）
 * @param timeout 超时时间（毫秒），默认 5 秒
 * @throws {Error} 如果数据库连接失败或超时
 */
export async function connectPrisma(timeout: number = 5000): Promise<void> {
  const loggerInstance = getLogger();
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    loggerInstance.warn('DATABASE_URL 未设置，跳过数据库连接');
    throw new Error('DATABASE_URL 未设置');
  }
  
  const prismaInstance = getPrismaClient();
  
  try {
    const connectPromise = prismaInstance.$connect();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`数据库连接超时（${timeout}ms）`));
      }, timeout);
    });

    await Promise.race([connectPromise, timeoutPromise]);
    loggerInstance.info('数据库连接成功');
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    loggerInstance.error(`数据库连接失败: ${errorMsg}`);
    throw error;
  }
}

/**
 * 断开数据库连接
 */
export async function disconnectPrisma(): Promise<void> {
  const loggerInstance = getLogger();
  try {
    if (prisma) {
      await prisma.$disconnect();
    }
  } catch (error) {
    loggerInstance.error('断开数据库连接时出错:', error);
    throw error;
  }
}

/**
 * 优雅关闭数据库连接
 */
export async function gracefulShutdown(): Promise<void> {
  await disconnectPrisma();
}

// 处理进程退出信号
process.on('SIGINT', async () => {
  await gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await gracefulShutdown();
  process.exit(0);
});

/**
 * 导出 Prisma 客户端（延迟初始化）
 * 使用 getter 函数，确保延迟初始化
 */
export function getPrisma(): PrismaClient {
  return getPrismaClient();
}

// 为了向后兼容，创建一个 Proxy 对象
const prismaProxy = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const instance = getPrismaClient();
    const value = instance[prop as keyof PrismaClient];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export { prismaProxy as prisma };
