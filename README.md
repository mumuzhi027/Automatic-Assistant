# Automatic Assistant

面向少量核心成员的私有行业情报助手。管理员创建账号并统一配置模型；成员维护关注任务、执行时间和个人记忆，系统定时生成结构化行业报告。

## 快速开始

需要 Node.js 20+。

```bash
npm install
npm install --prefix server
npm install --prefix web
copy .env.example server\\.env
npm run dev
```

打开 `http://localhost:5173`。

演示账号：

- 管理员：`admin` / `admin123`
- 用户：`member` / `member123`

未配置 DeepSeek API Key 时，任务会生成可展示的演示报告，方便完整体验流程。配置 Key 后会调用 OpenAI-compatible `/chat/completions` 接口。生产部署前请修改演示密码和 `JWT_SECRET`。

## 当前 MVP

- 管理员：系统概览、用户创建/停用/重置密码、模型配置、SMTP 邮件投递、运行记录
- 用户：概览、行业任务、手动执行/暂停、报告中心、Word 导出与邮件发送、报告反馈、长期记忆、个人画像
- 后端：JWT 鉴权、用户数据隔离、本地 JSON 持久化、每分钟调度、结构化报告、DeepSeek 适配层

本地 JSON 存储只用于低门槛演示和小规模试用。正式部署建议把 `server/src/store.js` 替换为 PostgreSQL 仓储，并将任务执行迁移到 Redis/BullMQ worker。

