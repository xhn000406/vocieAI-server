import { createClient } from 'redis';
import { initLogger } from './logger';

const logger = initLogger();

let redisClient: ReturnType<typeof createClient> | null = null;

export async function connectRedis() {
  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis 客户端错误:', err);
    });

    await redisClient.connect();
    logger.info('✅ Redis 连接成功');
  } catch (error) {
    logger.error('❌ Redis 连接失败:', error);
    throw error;
  }
}

export function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis 客户端未初始化');
  }
  return redisClient;
}

