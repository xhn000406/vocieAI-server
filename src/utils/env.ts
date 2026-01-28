/**
 * 环境变量工具函数
 */

import { DEFAULT_CONFIG } from '../constants';

/**
 * 获取环境变量，如果不存在则返回默认值
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`环境变量 ${key} 未设置且没有默认值`);
  }
  return value;
}

/**
 * 获取数字类型的环境变量
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = getEnv(key, defaultValue?.toString());
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`环境变量 ${key} 不是有效的数字: ${value}`);
  }
  return num;
}

/**
 * 获取布尔类型的环境变量
 */
export function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = getEnv(key, defaultValue?.toString());
  return value === 'true' || value === '1';
}

/**
 * 获取服务器配置
 */
export function getServerConfig() {
  return {
    port: getEnvNumber('PORT', DEFAULT_CONFIG.PORT),
    nodeEnv: getEnv('NODE_ENV', DEFAULT_CONFIG.NODE_ENV),
    frontendUrl: getEnv('FRONTEND_URL', DEFAULT_CONFIG.FRONTEND_URL),
  };
}
