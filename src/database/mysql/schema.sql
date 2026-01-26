-- MySQL 数据库初始化脚本

-- 创建数据库
CREATE DATABASE IF NOT EXISTS voice_ai DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE voice_ai;

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL COMMENT '邮箱',
  password VARCHAR(255) COMMENT '密码（加密）',
  name VARCHAR(100) NOT NULL COMMENT '用户名',
  avatar VARCHAR(500) COMMENT '头像URL',
  phone VARCHAR(20) COMMENT '手机号',
  subscription ENUM('free', 'pro') DEFAULT 'free' COMMENT '订阅类型',
  subscription_expires_at DATETIME COMMENT '订阅过期时间',
  last_sync_at DATETIME COMMENT '最后同步时间',
  storage_used BIGINT DEFAULT 0 COMMENT '已使用存储空间（字节）',
  storage_limit BIGINT DEFAULT 1073741824 COMMENT '存储空间限制（字节，默认1GB）',
  settings JSON COMMENT '用户设置',
  oauth JSON COMMENT 'OAuth信息',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_email (email),
  UNIQUE KEY uk_phone (phone),
  INDEX idx_subscription (subscription),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 2. 会议表
CREATE TABLE IF NOT EXISTS meetings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  title VARCHAR(255) NOT NULL DEFAULT '无标题会议' COMMENT '会议标题',
  description TEXT COMMENT '会议描述',
  duration INT DEFAULT 0 COMMENT '会议时长（秒）',
  start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
  end_time DATETIME COMMENT '结束时间',
  audio_url VARCHAR(500) COMMENT '音频文件URL',
  audio_size BIGINT COMMENT '音频文件大小（字节）',
  status ENUM('recording', 'completed', 'archived') DEFAULT 'completed' COMMENT '状态',
  summary JSON COMMENT 'AI总结（关键词、摘要、待办等）',
  tags JSON COMMENT '标签列表',
  speakers JSON COMMENT '发言人信息',
  participants JSON COMMENT '参与者信息',
  is_archived BOOLEAN DEFAULT FALSE COMMENT '是否归档',
  is_shared BOOLEAN DEFAULT FALSE COMMENT '是否分享',
  share_token VARCHAR(64) COMMENT '分享令牌',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_user_status (user_id, status),
  INDEX idx_share_token (share_token),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会议表';

-- 3. 转写内容表
CREATE TABLE IF NOT EXISTS transcripts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  meeting_id BIGINT NOT NULL COMMENT '会议ID',
  text TEXT NOT NULL COMMENT '转写文本',
  timestamp INT NOT NULL COMMENT '时间戳（秒）',
  speaker_id VARCHAR(50) COMMENT '发言人ID',
  speaker_name VARCHAR(100) COMMENT '发言人名称',
  is_highlighted BOOLEAN DEFAULT FALSE COMMENT '是否高亮',
  confidence DECIMAL(3,2) COMMENT '置信度（0-1）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_meeting_id (meeting_id),
  INDEX idx_meeting_timestamp (meeting_id, timestamp),
  INDEX idx_speaker_id (speaker_id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='转写内容表';

-- 4. 标签表
CREATE TABLE IF NOT EXISTS tags (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  name VARCHAR(50) NOT NULL COMMENT '标签名称',
  color VARCHAR(20) DEFAULT '#6366f1' COMMENT '标签颜色',
  icon VARCHAR(50) COMMENT '标签图标',
  usage_count INT DEFAULT 0 COMMENT '使用次数',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_name (user_id, name),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标签表';

-- 5. 文件表
CREATE TABLE IF NOT EXISTS files (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  meeting_id BIGINT COMMENT '关联的会议ID',
  filename VARCHAR(255) NOT NULL COMMENT '文件名',
  original_name VARCHAR(255) NOT NULL COMMENT '原始文件名',
  mime_type VARCHAR(100) NOT NULL COMMENT 'MIME类型',
  size BIGINT NOT NULL COMMENT '文件大小（字节）',
  url VARCHAR(500) NOT NULL COMMENT '文件URL',
  storage_type ENUM('minio', 's3') NOT NULL COMMENT '存储类型',
  storage_key VARCHAR(500) NOT NULL COMMENT '存储键',
  is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_meeting_id (meeting_id),
  UNIQUE KEY uk_storage_key (storage_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文件表';

-- 6. 分享表
CREATE TABLE IF NOT EXISTS shares (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  meeting_id BIGINT NOT NULL COMMENT '会议ID',
  user_id BIGINT NOT NULL COMMENT '创建者ID',
  token VARCHAR(64) NOT NULL COMMENT '分享令牌',
  password VARCHAR(255) COMMENT '访问密码（加密）',
  expires_at DATETIME COMMENT '过期时间',
  access_count INT DEFAULT 0 COMMENT '访问次数',
  max_access INT COMMENT '最大访问次数',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_token (token),
  INDEX idx_meeting_id (meeting_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分享表';

-- 7. 用户统计表
CREATE TABLE IF NOT EXISTS user_stats (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  total_meetings INT DEFAULT 0 COMMENT '总会议数',
  total_duration BIGINT DEFAULT 0 COMMENT '总录音时长（秒）',
  total_storage BIGINT DEFAULT 0 COMMENT '总存储空间（字节）',
  last_meeting_at DATETIME COMMENT '最后会议时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_id (user_id),
  INDEX idx_last_meeting_at (last_meeting_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户统计表';

-- 8. 会议统计表
CREATE TABLE IF NOT EXISTS meeting_stats (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  meeting_id BIGINT NOT NULL COMMENT '会议ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  transcript_count INT DEFAULT 0 COMMENT '转写条数',
  transcript_length INT DEFAULT 0 COMMENT '转写总长度（字符数）',
  keyword_count INT DEFAULT 0 COMMENT '关键词数量',
  todo_count INT DEFAULT 0 COMMENT '待办事项数量',
  completed_todo_count INT DEFAULT 0 COMMENT '已完成待办数量',
  speaker_count INT DEFAULT 0 COMMENT '发言人数',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_meeting_id (meeting_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会议统计表';

-- 9. 系统日志表
CREATE TABLE IF NOT EXISTS system_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT COMMENT '用户ID',
  action VARCHAR(50) NOT NULL COMMENT '操作类型',
  resource_type VARCHAR(50) COMMENT '资源类型',
  resource_id BIGINT COMMENT '资源ID',
  ip_address VARCHAR(45) COMMENT 'IP地址',
  user_agent TEXT COMMENT '用户代理',
  details JSON COMMENT '详细信息',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_resource_type (resource_type),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统日志表';

-- 10. 订阅记录表
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  plan_type ENUM('free', 'pro') NOT NULL COMMENT '计划类型',
  provider VARCHAR(20) COMMENT '支付提供商：revenuecat/wechat',
  transaction_id VARCHAR(100) COMMENT '交易ID',
  amount DECIMAL(10,2) COMMENT '金额',
  currency VARCHAR(10) DEFAULT 'CNY' COMMENT '货币',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending/success/failed/refunded',
  start_date DATETIME COMMENT '开始时间',
  end_date DATETIME COMMENT '结束时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_end_date (end_date),
  INDEX idx_transaction_id (transaction_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订阅记录表';

-- 11. API调用记录表
CREATE TABLE IF NOT EXISTS api_calls (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT COMMENT '用户ID',
  api_type VARCHAR(50) NOT NULL COMMENT 'API类型：nls/dashscope',
  endpoint VARCHAR(200) NOT NULL COMMENT 'API端点',
  method VARCHAR(10) NOT NULL COMMENT 'HTTP方法',
  status_code INT COMMENT '状态码',
  response_time INT COMMENT '响应时间（毫秒）',
  cost DECIMAL(10,4) COMMENT '调用成本',
  error_message TEXT COMMENT '错误信息',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_api_type (api_type),
  INDEX idx_status_code (status_code),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='API调用记录表';

-- 12. 文件统计表
CREATE TABLE IF NOT EXISTS file_stats (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  total_files INT DEFAULT 0 COMMENT '总文件数',
  total_size BIGINT DEFAULT 0 COMMENT '总文件大小（字节）',
  audio_files INT DEFAULT 0 COMMENT '音频文件数',
  audio_size BIGINT DEFAULT 0 COMMENT '音频文件大小（字节）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文件统计表';
