/**
 * 全局类型定义
 */

import { Request, Response } from 'express';

/**
 * API 响应标准格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

/**
 * 健康检查响应
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime?: number;
  environment?: string;
  version?: string;
}

/**
 * 扩展的 Express Request 类型
 */
export interface AppRequest extends Request {
  userId?: string;
  user?: any;
}

/**
 * 扩展的 Express Response 类型
 */
export interface AppResponse extends Response {
  success: (data?: any, message?: string) => Response;
  error: (message: string, statusCode?: number) => Response;
}

/**
 * 服务器配置
 */
export interface ServerConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
}
