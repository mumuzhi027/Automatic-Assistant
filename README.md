# Automatic Assistant

一个面向小型团队和核心成员的私有行业情报助手。

系统可以根据成员设置的行业主题、关键词、信息源和执行时间，定期收集近期信息并生成结构化行业报告。管理员统一维护成员账号、AI 模型和邮件服务，成员则可以管理自己的情报任务、报告、长期记忆与个人画像。

> 当前版本为 MVP，适合本地演示、小团队试用和功能验证。

## 核心能力

### 情报任务

- 创建、编辑、暂停和删除个人情报任务
- 设置行业主题、关注关键词和排除关键词
- 配置需要重点回答的问题
- 支持添加 RSS、新闻栏目、官方博客或具体网页作为补充信息源
- 支持最近 24 小时、48 小时、3 天或 7 天的信息范围
- 支持按固定天数间隔执行
- 支持按每周指定日期执行
- 支持手动立即生成报告
- 支持报告生成后自动发送 Word 文件

### 结构化行业报告

每份报告包含：

1. 本期摘要
2. 重要动态与重要度评分
3. 趋势判断
4. 潜在机会
5. 风险与不确定性
6. 建议下一步
7. 信息来源

成员可以搜索和查看历史报告，也可以：

- 导出 `.docx` Word 文件
- 将报告发送到个人邮箱
- 删除不再需要的报告
- 提交“有价值”“一般”“不感兴趣”或“继续关注”等反馈
- 查看报告生成耗时和 Token 使用量

### 个性化与长期记忆

- 维护个人角色、所在组织和工作背景
- 设置长期关注方向
- 设置喜欢的报告表达风格
- 主动添加长期偏好或排除项
- 对系统整理出的候选记忆进行确认或忽略
- 后续报告可结合个人画像和已确认记忆生成

### 管理员后台

- 查看成员、任务和自动运行的整体状态
- 创建、编辑、停用、恢复或移除成员
- 为成员重置密码
- 设置成员的手动执行权限、每日上限和冷却时间
- 统一配置 OpenAI-compatible 模型服务
- 保存并测试模型接口
- 配置 SMTP 邮件投递服务
- 发送测试邮件
- 查看自动任务和手动任务的运行记录及错误信息

### 权限与安全

- 使用 JWT 进行身份认证
- 区分管理员和普通成员权限
- 对成员任务、报告、记忆等数据进行用户隔离
- 登录、信息源预览和邮件发送接口具有限流保护
- 使用 `bcryptjs` 保存密码哈希
- 使用 `helmet` 设置常用 HTTP 安全响应头
- API Key、SMTP 授权码和 JWT 密钥通过环境变量或管理端配置

## 工作流程

```text
管理员创建成员并配置模型、邮件服务
                  ↓
成员完善个人画像和长期关注方向
                  ↓
创建行业情报任务并设置执行计划
                  ↓
系统定时或手动收集信息并调用模型
                  ↓
生成结构化报告，保存并按需发送邮件
                  ↓
成员查看报告、导出 Word 并提交反馈
                  ↓
确认稳定偏好，逐步完善长期记忆
```

## 技术栈

### 前端

- Vue 3
- Vue Router
- Vite
- Lucide Vue

### 后端

- Node.js
- Express 5
- JWT
- bcryptjs
- Nodemailer
- RSS Parser
- docx

### 数据与模型

- 本地 JSON 数据持久化
- OpenAI-compatible `/chat/completions` 接口
- 默认适配 DeepSeek API

## 项目结构

```text
Automatic Assistant/
├─ web/                    # Vue 前端
│  ├─ src/pages/           # 用户端和管理端页面
│  └─ vite.config.js
├─ server/                 # Express 后端
│  └─ src/
│     ├─ index.js          # API 与服务入口
│     ├─ auth.js           # 身份认证与权限控制
│     ├─ store.js          # JSON 数据仓储
│     ├─ schedule.js       # 定时计划计算
│     ├─ report-service.js # 信息收集与报告生成
│     ├─ report-export.js  # Word 报告导出
│     └─ email-service.js  # SMTP 邮件投递
├─ deploy/                 # 宝塔、Nginx 和 PM2 部署配置
├─ .env.example            # 环境变量示例
└─ package.json            # 项目统一运行脚本
```

## 环境要求

- Node.js 20 或更高版本
- npm
- 可选：DeepSeek 或其他 OpenAI-compatible 模型 API
- 可选：支持 SMTP 的邮箱账号

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/mumuzhi027/Automatic-Assistant.git
cd Automatic-Assistant
```

### 2. 安装依赖

```bash
npm install
npm install --prefix server
npm install --prefix web
```

### 3. 创建环境配置

Git Bash：

```bash
cp .env.example server/.env
```

Windows CMD：

```cmd
copy .env.example server\.env
```

根据实际情况编辑 `server/.env`，至少建议修改：

```env
PORT=3000
HOST=127.0.0.1
JWT_SECRET=请替换为足够长的随机字符串
ADMIN_USERNAME=admin
ADMIN_NAME=系统管理员
ADMIN_PASSWORD=请替换为至少12位的安全密码
```

模型配置示例：

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

未配置 API Key 时，系统会生成演示报告，方便体验完整流程；配置有效 Key 后，系统会调用兼容 OpenAI 格式的 `/chat/completions` 接口。

### 4. 启动开发环境

```bash
npm run dev
```

访问：

- 前端：`http://localhost:5173`
- 后端健康检查：`http://localhost:3000/api/health`

### 5. 演示账号

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 管理员 | `admin` | `admin123` |
| 普通成员 | `member` | `member123` |

> 演示账号只适用于本地体验。正式部署前必须修改默认密码和 `JWT_SECRET`。

## 常用命令

```bash
# 同时启动前端和后端开发服务
npm run dev

# 构建前端
npm run build

# 启动后端
npm run start

# 构建前端并以生产方式启动后端
npm run start:prod

# 运行后端测试
npm test --prefix server
```

## 邮件投递

SMTP 可以在管理员后台的“邮件投递”页面配置，也可以在首次启动前通过环境变量初始化：

```env
SMTP_ENABLED=false
SMTP_HOST=
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_FROM_NAME=Automatic Assistant
```

使用 QQ 邮箱、163 邮箱等服务时，`SMTP_PASSWORD` 通常应填写邮箱服务生成的 SMTP 授权码，而不是邮箱登录密码。

## 生产部署

项目已提供 PM2、Nginx 和宝塔部署示例，具体步骤请查看：

- [`deploy/BAOTA.md`](deploy/BAOTA.md)
- [`deploy/ecosystem.config.cjs`](deploy/ecosystem.config.cjs)
- [`deploy/baota-nginx.conf`](deploy/baota-nginx.conf)
- [`deploy/server.env.example`](deploy/server.env.example)

生产环境部署前请务必：

- 修改管理员默认密码
- 使用随机且足够长的 `JWT_SECRET`
- 不要将 `server/.env` 提交到 Git
- 使用 HTTPS
- 限制数据目录和配置文件的访问权限
- 定期备份数据目录
- 根据实际域名和代理层配置 `TRUST_PROXY`

## 当前限制

- 本地 JSON 存储适合演示和少量成员使用，不适合高并发场景
- 定时任务与 API 服务运行在同一 Node.js 进程中
- 当前模型调用采用统一的 OpenAI-compatible 接口
- 外部信息源的可用性会受目标网站结构、RSS 支持和网络环境影响

正式扩展时建议：

- 使用 PostgreSQL 替代本地 JSON 仓储
- 使用 Redis 与 BullMQ 拆分任务队列和 Worker
- 为外部信息采集增加重试、缓存和来源质量评估
- 增加审计日志、自动化测试和可观测性

## 开发状态

当前项目处于 MVP 阶段，已完成成员管理、情报任务、自动调度、结构化报告、Word 导出、邮件发送、反馈与长期记忆等主要流程。

欢迎通过 Issue 提交问题或功能建议。
