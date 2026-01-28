# Voice AI Server

语音AI服务后端项目

## 项目结构

```
vocieAI-server/
├── src/                    # 源代码目录
│   ├── app/               # 应用核心代码
│   ├── config/            # 配置文件
│   ├── constants/         # 常量定义
│   ├── database/          # 数据库相关
│   ├── middleware/        # Express 中间件
│   ├── routes/            # 路由定义
│   ├── types/             # TypeScript 类型定义
│   └── utils/             # 工具函数
│
├── prisma/                # Prisma 相关文件
│   ├── schema.prisma     # 数据模型定义
│   └── migrations/        # 数据库迁移
│
├── scripts/               # 脚本文件
├── docs/                  # 文档目录
├── logs/                  # 日志文件
│
├── .env.example          # 环境变量示例（复制为 .env）
├── package.json          # 项目配置
└── tsconfig.json         # TypeScript 配置
```

## 环境要求

- **Node.js**: 20.x LTS 或更高版本（推荐）
- **npm**: 10.x 或更高版本
- **数据库**: MySQL 8.0+ 或兼容版本

> ⚠️ **注意**: 如果使用 Node.js 18.x，Prisma 7.3.0 可能无法正常工作。建议升级到 Node.js 20.x。

## 快速开始

### 1. 检查 Node.js 版本

```bash
node --version
```

如果版本低于 20.x，请先升级 Node.js：https://nodejs.org/

### 2. 安装依赖

```bash
npm install
```

> 💡 **提示**: 如果遇到依赖安装问题，请查看 `docs/TROUBLESHOOTING.md`

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置数据库连接等信息。

### 3. 生成 Prisma 客户端

```bash
npx prisma generate
```

### 4. 运行数据库迁移

```bash
npx prisma migrate dev
```

### 5. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

## 可用脚本

- `npm run dev` - 启动开发服务器（热重载）
- `npm run build` - 构建生产版本
- `npm start` - 启动生产服务器
- `npm run init:db` - 初始化数据库
- `npm run check:db` - 检查数据库连接

## API 端点

- `GET /health` - 健康检查
- `GET /api` - API 信息

## 技术栈

- **运行时**: Node.js
- **框架**: Express.js
- **语言**: TypeScript
- **数据库**: MySQL (Prisma ORM)
- **日志**: Winston

## 文档

更多详细信息请查看 `docs/` 目录：

- `CODE_STANDARDS.md` - 代码规范
- `DIRECTORY_STRUCTURE.md` - 目录结构说明
- `TROUBLESHOOTING.md` - 故障排除指南
- `PRISMA_MIGRATION.md` - Prisma 迁移指南

## 常见问题

### tsx 命令未找到？

如果遇到 `'tsx' 不是内部或外部命令` 错误：

1. **推荐方案**: 升级 Node.js 到 20.x 或更高版本
2. **临时方案**: 脚本已更新为使用 `npx tsx`，可以直接运行 `npm run dev`

详细解决方案请查看 `docs/TROUBLESHOOTING.md`

## 开发规范

请遵循项目代码规范，详见 `docs/CODE_STANDARDS.md`。
