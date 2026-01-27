-- ============================================
-- AI实时语音转写应用 - 数据库设计文档
-- ============================================
-- 数据库名称: biji_db
-- 字符集: utf8mb4
-- 排序规则: utf8mb4_unicode_ci
-- ============================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS biji_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE biji_db;

-- ============================================
-- 1. 用户表 (users)
-- ============================================
-- 功能：存储用户基本信息和账户设置
-- 说明：支持邮箱密码登录和OAuth登录（Google/Apple/微信）
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID（主键）',
    email VARCHAR(255) NOT NULL UNIQUE COMMENT '邮箱（登录账号，唯一）',
    password VARCHAR(255) NULL COMMENT '密码（bcrypt加密存储，OAuth用户可为空）',
    name VARCHAR(100) NOT NULL COMMENT '用户姓名',
    avatar VARCHAR(500) NULL COMMENT '头像URL',
    phone VARCHAR(20) NULL COMMENT '手机号',
    subscription ENUM('free', 'pro') NOT NULL DEFAULT 'free' COMMENT '订阅类型：free-免费版，pro-专业版',
    subscription_expires_at DATETIME NULL COMMENT '订阅过期时间（NULL表示永久有效）',
    last_sync_at DATETIME NULL COMMENT '最后同步时间（用于多端同步）',
    storage_used BIGINT NOT NULL DEFAULT 0 COMMENT '已使用存储空间（字节）',
    storage_limit BIGINT NOT NULL DEFAULT 1073741824 COMMENT '存储空间限制（字节，默认1GB，pro用户可扩展）',
    settings JSON NOT NULL COMMENT '用户设置JSON：{"language":"zh-CN","theme":"auto","notifications":true}',
    oauth JSON NULL COMMENT 'OAuth登录信息JSON：{"google":{"id":"xxx","email":"xxx"},"apple":{},"wechat":{}}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_email (email) COMMENT '邮箱索引（用于登录查询）',
    INDEX idx_subscription (subscription) COMMENT '订阅类型索引',
    INDEX idx_created_at (created_at) COMMENT '创建时间索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================
-- 2. 会议表 (meetings)
-- ============================================
-- 功能：存储会议记录和元数据
-- 说明：每个会议属于一个用户，包含音频文件、转写内容、AI总结等
CREATE TABLE IF NOT EXISTS meetings (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '会议ID（主键）',
    user_id INT NOT NULL COMMENT '用户ID（关联users.id，数据完整性由应用层保证）',
    title VARCHAR(200) NOT NULL COMMENT '会议标题',
    description TEXT NULL COMMENT '会议描述（用户手动添加的备注）',
    duration INT NOT NULL DEFAULT 0 COMMENT '会议时长（秒）',
    start_time DATETIME NOT NULL COMMENT '开始时间',
    end_time DATETIME NULL COMMENT '结束时间（NULL表示会议进行中）',
    audio_url VARCHAR(500) NULL COMMENT '音频文件URL（存储在对象存储中）',
    audio_size BIGINT NULL COMMENT '音频文件大小（字节）',
    status ENUM('recording', 'completed', 'archived') NOT NULL DEFAULT 'completed' COMMENT '状态：recording-录制中，completed-已完成，archived-已归档',
    summary JSON NULL COMMENT '会议总结JSON：{"keywords":[],"summary":"","todos":[],"actionItems":[],"decisions":[]}',
    tags JSON NOT NULL DEFAULT '[]' COMMENT '标签列表（JSON数组，用于快速查询和展示）',
    speakers JSON NULL COMMENT '发言人列表JSON：[{"id":"sp1","name":"张三","color":"#ff0000","avatar":""}]',
    participants JSON NULL COMMENT '参与者列表JSON：[{"userId":"1","name":"张三","role":"主持人"}]',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已归档（归档后不显示在默认列表中）',
    is_shared BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已分享（是否有分享链接）',
    share_token VARCHAR(100) NULL UNIQUE COMMENT '分享令牌（用于生成分享链接，唯一）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_user_id (user_id) COMMENT '用户ID索引（用于查询用户的所有会议，数据完整性由应用层保证）',
    INDEX idx_status (status) COMMENT '状态索引（用于筛选不同状态的会议）',
    INDEX idx_start_time (start_time) COMMENT '开始时间索引（用于按时间排序）',
    INDEX idx_share_token (share_token) COMMENT '分享令牌索引（用于快速查找分享）',
    INDEX idx_created_at (created_at) COMMENT '创建时间索引',
    INDEX idx_is_archived (is_archived) COMMENT '归档状态索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会议表';

-- ============================================
-- 3. 转写内容表 (transcripts)
-- ============================================
-- 功能：存储实时语音转写的文本内容
-- 说明：每个会议可以有多条转写记录，按时间戳排序
-- 优化：此表数据量巨大，采用以下优化策略：
--       1. 复合索引优化查询性能
--       2. 批量插入优化（使用批量插入接口）
--       3. 定期归档旧数据到 transcripts_archive 表
--       4. 考虑按 meeting_id 分表（如果单表数据超过千万级）
CREATE TABLE IF NOT EXISTS transcripts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '转写ID（主键，使用BIGINT以支持大量数据）',
    meeting_id INT NOT NULL COMMENT '会议ID（关联meetings.id，数据完整性由应用层保证）',
    text TEXT NOT NULL COMMENT '转写文本内容（单条转写文本，建议不超过64KB）',
    timestamp INT NOT NULL COMMENT '时间戳（秒，从会议开始时间算起）',
    speaker_id VARCHAR(50) NULL COMMENT '发言人ID（用于多人识别，关联speakers中的id）',
    speaker_name VARCHAR(100) NULL COMMENT '发言人姓名（冗余字段，便于查询，避免JOIN）',
    is_highlighted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否高亮（用户标记的重要内容）',
    confidence DECIMAL(5,2) NULL COMMENT '识别置信度（0.00-1.00，NULL表示未提供）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（转写生成时间）',
    -- 复合索引：最常用的查询场景（按会议ID和时间戳查询）
    -- 注意：数据完整性由应用层保证，删除会议时需要在应用层级联删除转写
    INDEX idx_meeting_timestamp (meeting_id, timestamp) COMMENT '复合索引：会议ID+时间戳（覆盖最常用查询）',
    -- 复合索引：按会议和发言人查询
    INDEX idx_meeting_speaker (meeting_id, speaker_id) COMMENT '复合索引：会议ID+发言人ID',
    -- 复合索引：按会议和高亮状态查询
    INDEX idx_meeting_highlighted (meeting_id, is_highlighted) COMMENT '复合索引：会议ID+高亮状态',
    -- 单列索引：用于其他查询场景
    INDEX idx_created_at (created_at) COMMENT '创建时间索引（用于数据归档和清理）',
    INDEX idx_speaker_id (speaker_id) COMMENT '发言人ID索引（用于跨会议查询）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
ROW_FORMAT=COMPRESSED 
KEY_BLOCK_SIZE=8 
COMMENT='转写内容表（大数据量表，建议定期归档）';

-- ============================================
-- 3.1. 转写内容归档表 (transcripts_archive)
-- ============================================
-- 功能：存储归档的转写内容（6个月前的数据）
-- 说明：定期将旧数据从 transcripts 迁移到此表，减少主表数据量
CREATE TABLE IF NOT EXISTS transcripts_archive (
    id BIGINT NOT NULL COMMENT '转写ID（原transcripts表的id）',
    meeting_id INT NOT NULL COMMENT '会议ID',
    text TEXT NOT NULL COMMENT '转写文本内容',
    timestamp INT NOT NULL COMMENT '时间戳（秒）',
    speaker_id VARCHAR(50) NULL COMMENT '发言人ID',
    speaker_name VARCHAR(100) NULL COMMENT '发言人姓名',
    is_highlighted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否高亮',
    confidence DECIMAL(5,2) NULL COMMENT '识别置信度',
    created_at DATETIME NOT NULL COMMENT '创建时间',
    archived_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '归档时间',
    PRIMARY KEY (id, archived_at),
    INDEX idx_meeting_timestamp (meeting_id, timestamp),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
ROW_FORMAT=COMPRESSED 
KEY_BLOCK_SIZE=8 
COMMENT='转写内容归档表（存储6个月前的转写数据）'
PARTITION BY RANGE (YEAR(archived_at) * 100 + MONTH(archived_at)) (
    PARTITION p202401 VALUES LESS THAN (202402),
    PARTITION p202402 VALUES LESS THAN (202403),
    PARTITION p202403 VALUES LESS THAN (202404),
    PARTITION p202404 VALUES LESS THAN (202405),
    PARTITION p202405 VALUES LESS THAN (202406),
    PARTITION p202406 VALUES LESS THAN (202407),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- ============================================
-- 4. 总结快照表 (summary_snapshots)
-- ============================================
-- 功能：存储AI生成的实时和最终总结快照
-- 说明：会议进行中会生成多个实时快照，会议结束后生成最终快照
CREATE TABLE IF NOT EXISTS summary_snapshots (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '快照ID（主键）',
    meeting_id INT NOT NULL COMMENT '会议ID（关联meetings.id，数据完整性由应用层保证）',
    snapshot_type ENUM('realtime', 'final') NOT NULL COMMENT '快照类型：realtime-实时快照，final-最终快照',
    summary_data JSON NOT NULL COMMENT '总结数据JSON：{"keywords":[],"summary":"","todos":[],"actionItems":[],"decisions":[],"lastUpdated":"2024-01-01T00:00:00Z"}',
    transcript_count INT NOT NULL COMMENT '转写条数（生成快照时的转写记录数）',
    transcript_length INT NOT NULL COMMENT '转写文本总长度（字符数）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（快照生成时间）',
    INDEX idx_meeting_id (meeting_id) COMMENT '会议ID索引（数据完整性由应用层保证，删除会议时需要在应用层级联删除快照）',
    INDEX idx_snapshot_type (snapshot_type) COMMENT '快照类型索引（用于区分实时和最终快照）',
    INDEX idx_created_at (created_at) COMMENT '创建时间索引（用于按时间排序）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='总结快照表';

-- ============================================
-- 5. 标签表 (tags)
-- ============================================
-- 功能：存储用户自定义标签
-- 说明：每个用户可以有多个标签，标签可以关联多个会议（多对多关系）
CREATE TABLE IF NOT EXISTS tags (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '标签ID（主键）',
    user_id INT NOT NULL COMMENT '用户ID（关联users.id，数据完整性由应用层保证）',
    name VARCHAR(50) NOT NULL COMMENT '标签名称',
    color VARCHAR(20) NOT NULL DEFAULT '#6366f1' COMMENT '标签颜色（十六进制颜色码）',
    icon VARCHAR(50) NULL COMMENT '标签图标（图标名称或URL）',
    usage_count INT NOT NULL DEFAULT 0 COMMENT '使用次数（关联的会议数量）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_user_tag (user_id, name) COMMENT '唯一约束：同一用户不能有重复的标签名（数据完整性由应用层保证，删除用户时需要在应用层级联删除标签）',
    INDEX idx_user_id (user_id) COMMENT '用户ID索引（用于查询用户的所有标签）',
    INDEX idx_usage_count (usage_count) COMMENT '使用次数索引（用于按使用频率排序）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表';

-- ============================================
-- 6. 会议标签关联表 (meeting_tags)
-- ============================================
-- 功能：会议和标签的多对多关系表
-- 说明：一个会议可以有多个标签，一个标签可以关联多个会议
CREATE TABLE IF NOT EXISTS meeting_tags (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '关联ID（主键）',
    meeting_id INT NOT NULL COMMENT '会议ID（关联meetings.id，数据完整性由应用层保证）',
    tag_id INT NOT NULL COMMENT '标签ID（关联tags.id，数据完整性由应用层保证）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（关联创建时间）',
    UNIQUE KEY uk_meeting_tag (meeting_id, tag_id) COMMENT '唯一约束：同一会议不能重复关联同一标签（数据完整性由应用层保证，删除会议或标签时需要在应用层级联删除关联）',
    INDEX idx_meeting_id (meeting_id) COMMENT '会议ID索引（用于查询会议的所有标签）',
    INDEX idx_tag_id (tag_id) COMMENT '标签ID索引（用于查询标签关联的所有会议）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会议标签关联表';

-- ============================================
-- 7. 文件表 (files)
-- ============================================
-- 功能：存储导出文件和音频文件信息
-- 说明：包括会议音频文件、导出的PDF/Markdown文件等
CREATE TABLE IF NOT EXISTS files (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '文件ID（主键）',
    user_id INT NOT NULL COMMENT '用户ID（关联users.id，数据完整性由应用层保证）',
    meeting_id INT NULL COMMENT '会议ID（关联meetings.id，NULL表示非会议相关文件，数据完整性由应用层保证）',
    filename VARCHAR(255) NOT NULL COMMENT '文件名（存储系统中的文件名）',
    original_name VARCHAR(255) NOT NULL COMMENT '原始文件名（用户上传时的文件名）',
    mime_type VARCHAR(100) NOT NULL COMMENT 'MIME类型（如：audio/mpeg, application/pdf）',
    size BIGINT NOT NULL COMMENT '文件大小（字节）',
    url VARCHAR(500) NOT NULL COMMENT '文件访问URL（公开访问链接）',
    storage_type ENUM('minio', 's3') NOT NULL COMMENT '存储类型：minio-自建MinIO，s3-AWS S3',
    storage_key VARCHAR(500) NOT NULL COMMENT '存储键（对象存储中的key/path）',
    is_public BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否公开（公开文件无需认证即可访问）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（文件上传时间）',
    INDEX idx_user_id (user_id) COMMENT '用户ID索引（用于查询用户的所有文件，数据完整性由应用层保证，删除用户时需要在应用层级联删除文件）',
    INDEX idx_meeting_id (meeting_id) COMMENT '会议ID索引（用于查询会议的所有文件）',
    INDEX idx_storage_key (storage_key) COMMENT '存储键索引（用于快速定位文件）',
    INDEX idx_created_at (created_at) COMMENT '创建时间索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件表';

-- ============================================
-- 8. 分享表 (shares)
-- ============================================
-- 功能：存储会议分享链接和权限
-- 说明：用户可以创建分享链接，设置密码和过期时间
CREATE TABLE IF NOT EXISTS shares (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '分享ID（主键）',
    meeting_id INT NOT NULL COMMENT '会议ID（关联meetings.id，数据完整性由应用层保证）',
    user_id INT NOT NULL COMMENT '创建分享的用户ID（关联users.id，数据完整性由应用层保证）',
    token VARCHAR(100) NOT NULL UNIQUE COMMENT '分享令牌（用于生成分享链接，唯一）',
    password VARCHAR(255) NULL COMMENT '访问密码（bcrypt加密存储，NULL表示无密码）',
    expires_at DATETIME NULL COMMENT '过期时间（NULL表示永不过期）',
    access_count INT NOT NULL DEFAULT 0 COMMENT '访问次数（统计分享链接被访问的次数）',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否激活（false表示已禁用分享）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（分享创建时间）',
    INDEX idx_meeting_id (meeting_id) COMMENT '会议ID索引（用于查询会议的所有分享，数据完整性由应用层保证，删除会议或用户时需要在应用层级联删除分享）',
    INDEX idx_user_id (user_id) COMMENT '用户ID索引（用于查询用户创建的所有分享）',
    INDEX idx_token (token) COMMENT '分享令牌索引（用于快速查找分享）',
    INDEX idx_expires_at (expires_at) COMMENT '过期时间索引（用于清理过期分享）',
    INDEX idx_is_active (is_active) COMMENT '激活状态索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分享表';

-- ============================================
-- 9. 待办表 (todos)
-- ============================================
-- 功能：存储用户的待办事项
-- 说明：待办事项可以关联到会议（从会议总结中提取），也可以是用户手动创建的独立待办
CREATE TABLE IF NOT EXISTS todos (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '待办ID（主键）',
    user_id INT NOT NULL COMMENT '用户ID（关联users.id，数据完整性由应用层保证）',
    meeting_id INT NULL COMMENT '会议ID（关联meetings.id，NULL表示独立待办，非会议相关，数据完整性由应用层保证）',
    title VARCHAR(200) NOT NULL COMMENT '待办标题',
    description TEXT NULL COMMENT '待办描述（详细说明）',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '状态：pending-待处理，in_progress-进行中，completed-已完成，cancelled-已取消',
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium' COMMENT '优先级：low-低，medium-中，high-高，urgent-紧急',
    due_date DATETIME NULL COMMENT '截止日期（NULL表示无截止日期）',
    completed_at DATETIME NULL COMMENT '完成时间（NULL表示未完成）',
    assignee_id INT NULL COMMENT '分配给的用户ID（关联users.id，NULL表示分配给创建者自己，数据完整性由应用层保证）',
    tags JSON NOT NULL DEFAULT '[]' COMMENT '标签列表（JSON数组，用于快速查询和展示）',
    reminder_at DATETIME NULL COMMENT '提醒时间（NULL表示不提醒）',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已归档（归档后不显示在默认列表中）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_user_id (user_id) COMMENT '用户ID索引（用于查询用户的所有待办，数据完整性由应用层保证，删除用户时需要在应用层级联删除待办）',
    INDEX idx_meeting_id (meeting_id) COMMENT '会议ID索引（用于查询会议相关的待办）',
    INDEX idx_status (status) COMMENT '状态索引（用于筛选不同状态的待办）',
    INDEX idx_priority (priority) COMMENT '优先级索引（用于按优先级排序）',
    INDEX idx_due_date (due_date) COMMENT '截止日期索引（用于查询即将到期的待办）',
    INDEX idx_completed_at (completed_at) COMMENT '完成时间索引（用于查询已完成的待办）',
    INDEX idx_assignee_id (assignee_id) COMMENT '分配人ID索引（用于查询分配给特定用户的待办）',
    INDEX idx_is_archived (is_archived) COMMENT '归档状态索引',
    INDEX idx_created_at (created_at) COMMENT '创建时间索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='待办表';

-- ============================================
-- 数据库设计说明
-- ============================================
-- 
-- 【表关系说明】
-- 1. users (1) → (N) meetings: 一个用户可以有多个会议
-- 2. meetings (1) → (N) transcripts: 一个会议可以有多条转写记录
-- 3. meetings (1) → (N) summary_snapshots: 一个会议可以有多个总结快照
-- 4. users (1) → (N) tags: 一个用户可以创建多个标签
-- 5. meetings (N) ↔ (N) tags: 会议和标签是多对多关系（通过meeting_tags）
-- 6. users (1) → (N) files: 一个用户可以上传多个文件
-- 7. meetings (1) → (N) files: 一个会议可以关联多个文件
-- 8. meetings (1) → (N) shares: 一个会议可以有多个分享链接
-- 9. users (1) → (N) shares: 一个用户可以创建多个分享
--
-- 【索引说明】
-- - 所有关联字段都创建了索引以提高查询性能
-- - 常用查询字段（如email、status、start_time等）都创建了索引
-- - 唯一约束字段自动创建唯一索引
-- - 复合索引用于多字段查询优化
--
-- 【字符集说明】
-- - 使用utf8mb4字符集以支持emoji和特殊字符
-- - 使用utf8mb4_unicode_ci排序规则以获得更好的排序性能
--
-- 【存储引擎】
-- - 使用InnoDB存储引擎以支持事务
-- - InnoDB支持行级锁，适合高并发场景
--
-- 【数据完整性策略】
-- ⚠️ 重要：不使用外键约束，数据完整性完全由应用层保证
-- 
-- 原因：
-- 1. 提升写入性能（无外键检查开销）
-- 2. 支持高并发场景
-- 3. 灵活的数据操作（支持软删除等）
-- 4. 便于分库分表和分布式部署
--
-- 应用层必须实现：
-- 1. 插入前验证：插入数据前必须验证关联ID是否存在
-- 2. 级联删除：删除父记录时，必须手动删除所有子记录
-- 3. 数据一致性检查：定期运行脚本检查孤儿记录
--
-- 【应用层级联删除策略】
-- 
-- 删除用户时，必须按以下顺序删除：
-- 1. 删除 shares（用户创建的分享）
-- 2. 删除 meeting_tags（通过meetings关联）
-- 3. 删除 tags（用户的标签）
-- 4. 删除 files（用户的文件）
-- 5. 删除 transcripts（通过meetings关联）
-- 6. 删除 summary_snapshots（通过meetings关联）
-- 7. 删除 meetings（用户的会议）
-- 8. 最后删除 users
--
-- 删除会议时，必须按以下顺序删除：
-- 1. 删除 shares（会议的分享）
-- 2. 删除 meeting_tags（会议标签关联）
-- 3. 删除 transcripts（会议的转写）
-- 4. 删除 summary_snapshots（会议的总结快照）
-- 5. files.meeting_id 设为 NULL（保留文件记录）
-- 6. 最后删除 meetings
--
-- 删除标签时，必须删除：
-- 1. meeting_tags（标签关联记录）
-- 2. 最后删除 tags
--
-- 【数据完整性检查脚本】
-- 
-- 建议定期运行以下检查脚本（每月一次）：
-- 
-- 1. 检查孤儿会议记录：
--    SELECT m.id FROM meetings m 
--    LEFT JOIN users u ON m.user_id = u.id 
--    WHERE u.id IS NULL;
--
-- 2. 检查孤儿转写记录：
--    SELECT t.id FROM transcripts t 
--    LEFT JOIN meetings m ON t.meeting_id = m.id 
--    WHERE m.id IS NULL;
--
-- 3. 检查孤儿标签关联：
--    SELECT mt.id FROM meeting_tags mt 
--    LEFT JOIN meetings m ON mt.meeting_id = m.id 
--    LEFT JOIN tags t ON mt.tag_id = t.id 
--    WHERE m.id IS NULL OR t.id IS NULL;
--
-- 4. 检查孤儿文件记录：
--    SELECT f.id FROM files f 
--    LEFT JOIN users u ON f.user_id = u.id 
--    WHERE u.id IS NULL;
--
-- 5. 检查孤儿分享记录：
--    SELECT s.id FROM shares s 
--    LEFT JOIN meetings m ON s.meeting_id = m.id 
--    LEFT JOIN users u ON s.user_id = u.id 
--    WHERE m.id IS NULL OR u.id IS NULL;
--
-- 【应用层数据验证示例】
-- 
-- 插入会议前验证用户存在：
--   const user = await UserModel.findById(userId);
--   if (!user) throw new Error('User not found');
--   await MeetingModel.create({ userId, ... });
--
-- 删除用户时级联删除：
--   async function deleteUser(userId) {
--     const meetings = await MeetingModel.findByUserId(userId);
--     for (const meeting of meetings) {
--       await deleteMeeting(meeting.id);
--     }
--     await TagModel.deleteByUserId(userId);
--     await FileModel.deleteByUserId(userId);
--     await ShareModel.deleteByUserId(userId);
--     await UserModel.delete(userId);
--   }
--
-- 【性能优化建议】
-- 1. 定期清理过期的分享记录（expires_at < NOW()）
-- 2. 归档旧会议时，考虑将转写内容迁移到归档表
-- 3. 对于大量转写记录，考虑按时间分区
-- 4. 定期更新usage_count统计信息
--
-- 【transcripts 表大数据量优化方案】
-- 
-- 1. 批量插入优化：
--    - 使用批量插入接口，每次插入100-1000条记录
--    - 使用事务批量提交，减少IO次数
--    - 示例：INSERT INTO transcripts (meeting_id, text, timestamp, ...) VALUES (...), (...), (...)
--
-- 2. 数据归档策略：
--    - 每月执行一次归档任务，将6个月前的数据迁移到 transcripts_archive
--    - 归档脚本示例：
--      INSERT INTO transcripts_archive 
--      SELECT *, NOW() FROM transcripts 
--      WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);
--      DELETE FROM transcripts WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);
--
-- 3. 查询优化：
--    - 使用复合索引 idx_meeting_timestamp 覆盖最常用查询
--    - 分页查询时使用 LIMIT 和 OFFSET，避免一次性加载大量数据
--    - 对于历史数据查询，优先查询 transcripts_archive 表
--
-- 4. 分表策略（可选，当单表数据超过5000万条时）：
--    - 按 meeting_id 取模分表：transcripts_0, transcripts_1, ..., transcripts_9
--    - 或按年份分表：transcripts_2024, transcripts_2025, ...
--
-- 5. 存储优化：
--    - 使用 ROW_FORMAT=COMPRESSED 压缩存储
--    - 使用 KEY_BLOCK_SIZE=8 优化压缩效果
--    - 定期执行 OPTIMIZE TABLE transcripts 优化表结构
--
-- 6. 缓存策略：
--    - 使用 Redis 缓存最近会议的转写内容（最近7天）
--    - 缓存键格式：transcript:meeting:{meeting_id}
--    - 设置过期时间：7天
--
-- 7. 监控指标：
--    - 监控 transcripts 表的数据量增长趋势
--    - 监控查询性能（慢查询日志）
--    - 监控归档任务的执行时间和影响
-- ============================================
