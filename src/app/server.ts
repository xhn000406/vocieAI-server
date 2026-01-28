/**
 * Express 服务器入口文件
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer, Server } from 'http';
import { initSentry } from '../config/sentry';
import { initLogger } from '../config/logger';
import routes from '../routes';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';
import { getServerConfig } from '../utils/env';
import { API_PATHS } from '../constants';

dotenv.config();

// 初始化 Sentry
// initSentry();

const logger = initLogger();
const app: Express = express();
const httpServer: Server = createServer(app);
const config = getServerConfig();
const PORT = config.port;

/**
 * 配置中间件
 */
function setupMiddleware(): void {
  // 安全头
  app.use(helmet());

  // 响应压缩
  app.use(compression());

  // CORS 配置
  app.use(
    cors({
      origin: config.frontendUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // HTTP 请求日志
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );

  // JSON 解析
  app.use(express.json({ limit: '10mb' }));

  // URL 编码解析
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
}

/**
 * 配置路由
 */
function setupRoutes(): void {
  // 健康检查端点
  app.get(API_PATHS.HEALTH, (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // API 路由
  app.use(API_PATHS.API_BASE, routes);

  // 404 处理（必须在所有路由之后）
  app.use(notFoundHandler);
}

/**
 * 配置错误处理
 */
function setupErrorHandling(): void {
  // 全局错误处理（必须在所有中间件和路由之后）
  app.use(errorHandler);
}

/**
 * 启动服务器
 */
async function startServer(): Promise<void> {
  try {
    const { connectPrisma, gracefulShutdown } = await import('../config/database');
    
    setupMiddleware();
    setupRoutes();
    setupErrorHandling();

    // 等待数据库连接成功后再启动服务器
    logger.info('正在连接数据库...');
    try {
      await connectPrisma(10000); // 10秒超时
      logger.info('数据库连接成功');
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      logger.error(`数据库连接失败: ${errorMsg}`);
      logger.error('服务器启动失败：数据库连接是必需的');
      await gracefulShutdown();
      process.exit(1);
    }

    httpServer.listen(PORT, () => {
      logger.info('═══════════════════════════════════════════════════════');
      logger.info('🚀 服务器启动成功');
      logger.info(`📡 端口: ${PORT} | 环境: ${config.nodeEnv}`);
      logger.info(`🔗 健康检查: http://localhost:${PORT}${API_PATHS.HEALTH}`);
      logger.info(`📚 API 基础路径: http://localhost:${PORT}${API_PATHS.API_BASE}`);
      logger.info('═══════════════════════════════════════════════════════');
    });

    httpServer.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`端口 ${PORT} 已被占用，请关闭占用该端口的进程或更改端口配置`);
        logger.error(`提示: 可以使用命令查找占用端口的进程: netstat -ano | findstr :${PORT}`);
      } else {
        logger.error('服务器启动失败:', error.message);
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('启动服务器失败:', error);
    try {
      const { gracefulShutdown } = await import('../config/database');
      await gracefulShutdown();
    } catch (e) {
      // 忽略关闭错误
    }
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', async (error: Error) => {
  const errorMsg = error?.message || String(error);
  logger.error(`未捕获的异常: ${errorMsg}`);
  if (error.stack) {
    logger.error(error.stack);
  }
  try {
    const { gracefulShutdown } = await import('../config/database');
    await gracefulShutdown();
  } catch (e) {
    // 忽略关闭错误
  }
  process.exit(1);
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', async (reason: any, promise: Promise<any>) => {
  const reasonMsg = reason?.message || String(reason);
  logger.error(`未处理的 Promise 拒绝: ${reasonMsg}`);
  if (reason?.stack) {
    logger.error(reason.stack);
  }
  try {
    const { gracefulShutdown } = await import('../config/database');
    await gracefulShutdown();
  } catch (e) {
    // 忽略关闭错误
  }
  process.exit(1);
});

// 启动服务器
startServer();

export default app;
