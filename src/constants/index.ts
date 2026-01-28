/**
 * 应用常量定义
 */

/**
 * 默认配置值
 */
export const DEFAULT_CONFIG = {
  PORT: 3000,
  NODE_ENV: 'development',
  FRONTEND_URL: '*',
  API_VERSION: '1.0.0',
} as const;

/**
 * HTTP 状态码
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * API 路径
 */
export const API_PATHS = {
  HEALTH: '/health',
  API_BASE: '/api',
  API_ROOT: '/',
} as const;

/**
 * 日志级别
 */
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
} as const;
