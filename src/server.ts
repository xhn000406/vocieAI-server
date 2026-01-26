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
import { connectMySQL } from './config/mysql';
import { connectRedis } from './config/redis';
import { initSocketIO } from './socket';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

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

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 路由
app.use('/api', routes);

// Socket.io
initSocketIO(io);

// 错误处理
app.use(errorHandler);

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await connectMySQL();
    await connectRedis();

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

