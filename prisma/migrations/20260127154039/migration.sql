-- CreateTable
CREATE TABLE `files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `meeting_id` INTEGER NULL,
    `filename` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `size` BIGINT NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `storage_type` ENUM('minio', 's3') NOT NULL,
    `storage_key` VARCHAR(500) NOT NULL,
    `is_public` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_meeting_id`(`meeting_id`),
    INDEX `idx_storage_key`(`storage_key`),
    INDEX `idx_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meeting_participants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `meeting_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `name` VARCHAR(100) NOT NULL,
    `role` VARCHAR(50) NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(20) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_meeting_id`(`meeting_id`),
    INDEX `idx_name`(`name`),
    INDEX `idx_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meeting_speakers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `meeting_id` INTEGER NOT NULL,
    `speaker_id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `color` VARCHAR(20) NULL,
    `avatar` VARCHAR(500) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_meeting_id`(`meeting_id`),
    INDEX `idx_speaker_id`(`speaker_id`),
    UNIQUE INDEX `uk_meeting_speaker`(`meeting_id`, `speaker_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meeting_summaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `meeting_id` INTEGER NOT NULL,
    `summary_text` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `meeting_id`(`meeting_id`),
    INDEX `idx_meeting_id`(`meeting_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meeting_tags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `meeting_id` INTEGER NOT NULL,
    `tag_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_meeting_id`(`meeting_id`),
    INDEX `idx_tag_id`(`tag_id`),
    UNIQUE INDEX `uk_meeting_tag`(`meeting_id`, `tag_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meetings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `duration` INTEGER NOT NULL DEFAULT 0,
    `start_time` DATETIME(0) NOT NULL,
    `end_time` DATETIME(0) NULL,
    `audio_url` VARCHAR(500) NULL,
    `audio_size` BIGINT NULL,
    `status` ENUM('recording', 'completed', 'archived') NOT NULL DEFAULT 'completed',
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `is_shared` BOOLEAN NOT NULL DEFAULT false,
    `share_token` VARCHAR(100) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `share_token`(`share_token`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_is_archived`(`is_archived`),
    INDEX `idx_share_token`(`share_token`),
    INDEX `idx_start_time`(`start_time`),
    INDEX `idx_status`(`status`),
    INDEX `idx_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shares` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `meeting_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `token` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NULL,
    `expires_at` DATETIME(0) NULL,
    `access_count` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `token`(`token`),
    INDEX `idx_expires_at`(`expires_at`),
    INDEX `idx_is_active`(`is_active`),
    INDEX `idx_meeting_id`(`meeting_id`),
    INDEX `idx_token`(`token`),
    INDEX `idx_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `summary_snapshots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `meeting_id` INTEGER NOT NULL,
    `snapshot_type` ENUM('realtime', 'final') NOT NULL,
    `summary_text` TEXT NULL,
    `transcript_count` INTEGER NOT NULL,
    `transcript_length` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_meeting_id`(`meeting_id`),
    INDEX `idx_snapshot_type`(`snapshot_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `color` VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    `icon` VARCHAR(50) NULL,
    `usage_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_usage_count`(`usage_count`),
    INDEX `idx_user_id`(`user_id`),
    UNIQUE INDEX `uk_user_tag`(`user_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `todo_tags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `todo_id` INTEGER NOT NULL,
    `tag_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_tag_id`(`tag_id`),
    INDEX `idx_todo_id`(`todo_id`),
    UNIQUE INDEX `uk_todo_tag`(`todo_id`, `tag_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `todos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `meeting_id` INTEGER NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    `due_date` DATETIME(0) NULL,
    `completed_at` DATETIME(0) NULL,
    `assignee_id` INTEGER NULL,
    `reminder_at` DATETIME(0) NULL,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_assignee_id`(`assignee_id`),
    INDEX `idx_completed_at`(`completed_at`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_due_date`(`due_date`),
    INDEX `idx_is_archived`(`is_archived`),
    INDEX `idx_meeting_id`(`meeting_id`),
    INDEX `idx_priority`(`priority`),
    INDEX `idx_status`(`status`),
    INDEX `idx_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transcripts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `meeting_id` INTEGER NOT NULL,
    `text` TEXT NOT NULL,
    `timestamp` INTEGER NOT NULL,
    `speaker_id` VARCHAR(50) NULL,
    `speaker_name` VARCHAR(100) NULL,
    `is_highlighted` BOOLEAN NOT NULL DEFAULT false,
    `confidence` DECIMAL(5, 2) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_meeting_highlighted`(`meeting_id`, `is_highlighted`),
    INDEX `idx_meeting_speaker`(`meeting_id`, `speaker_id`),
    INDEX `idx_meeting_timestamp`(`meeting_id`, `timestamp`),
    INDEX `idx_speaker_id`(`speaker_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transcripts_archive` (
    `id` BIGINT NOT NULL,
    `meeting_id` INTEGER NOT NULL,
    `text` TEXT NOT NULL,
    `timestamp` INTEGER NOT NULL,
    `speaker_id` VARCHAR(50) NULL,
    `speaker_name` VARCHAR(100) NULL,
    `is_highlighted` BOOLEAN NOT NULL DEFAULT false,
    `confidence` DECIMAL(5, 2) NULL,
    `created_at` DATETIME(0) NOT NULL,
    `archived_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_meeting_timestamp`(`meeting_id`, `timestamp`),
    PRIMARY KEY (`id`, `archived_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_oauth` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `provider` ENUM('google', 'apple', 'wechat') NOT NULL,
    `provider_user_id` VARCHAR(255) NOT NULL,
    `provider_email` VARCHAR(255) NULL,
    `access_token` VARCHAR(500) NULL,
    `refresh_token` VARCHAR(500) NULL,
    `expires_at` DATETIME(0) NULL,
    `extra_data` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_provider_user_id`(`provider`, `provider_user_id`),
    INDEX `idx_user_id`(`user_id`),
    UNIQUE INDEX `uk_provider_user`(`provider`, `provider_user_id`),
    UNIQUE INDEX `uk_user_provider`(`user_id`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `setting_key` VARCHAR(100) NOT NULL,
    `setting_value` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_user_id`(`user_id`),
    UNIQUE INDEX `uk_user_setting`(`user_id`, `setting_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NULL,
    `name` VARCHAR(100) NOT NULL,
    `avatar` VARCHAR(500) NULL,
    `phone` VARCHAR(20) NULL,
    `subscription` ENUM('free', 'pro') NOT NULL DEFAULT 'free',
    `subscription_expires_at` DATETIME(0) NULL,
    `last_sync_at` DATETIME(0) NULL,
    `storage_used` BIGINT NOT NULL DEFAULT 0,
    `storage_limit` BIGINT NOT NULL DEFAULT 1073741824,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `email`(`email`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_email`(`email`),
    INDEX `idx_subscription`(`subscription`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
