import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initSentry } from './config/sentry';
import { initLogger } from './config/logger';
import { connectRedis, getRedisClient } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { getPrisma } from './config/database';

// 加载环境变量
dotenv.config();

// 初始化 Sentry
initSentry();

// 初始化 Logger
const logger = initLogger();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;
const startTime = Date.now();

// 中间件
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查接口
app.get('/health', async (req, res) => {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000), // 运行时间（秒）
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: {
        status: 'unknown',
        message: '',
      },
      redis: {
        status: 'unknown',
        message: '',
      },
    },
  };

  let overallStatus = 'ok';

  // 检查数据库连接
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    healthStatus.services.database.status = 'healthy';
    healthStatus.services.database.message = '数据库连接正常';
  } catch (error: any) {
    healthStatus.services.database.status = 'unhealthy';
    healthStatus.services.database.message = error?.message || '数据库连接失败';
    overallStatus = 'degraded';
  }

  // 检查 Redis 连接（如果启用）
  try {
    const redisClient = getRedisClient();
    await redisClient.ping();
    healthStatus.services.redis.status = 'healthy';
    healthStatus.services.redis.message = 'Redis 连接正常';
  } catch (error: any) {
    // Redis 可能未启用，不影响整体健康状态
    const errorMessage = error?.message || 'Redis 未启用或连接失败';
    if (errorMessage.includes('未初始化')) {
      healthStatus.services.redis.status = 'unavailable';
      healthStatus.services.redis.message = 'Redis 未启用';
    } else {
      healthStatus.services.redis.status = 'unhealthy';
      healthStatus.services.redis.message = errorMessage;
    }
  }

  // 如果数据库不健康，返回 503 状态码
  const statusCode = overallStatus === 'ok' ? 200 : 503;
  healthStatus.status = overallStatus;

  res.status(statusCode).json(healthStatus);
});



// 错误处理
app.use(errorHandler);

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    // await connectRedis();

    httpServer.listen(PORT, () => {
      logger.info(`🚀 服务器运行在端口 ${PORT}`);
      logger.info(`📱 环境: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();

export default app;

