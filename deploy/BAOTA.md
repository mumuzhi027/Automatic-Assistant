# 宝塔部署说明（101.43.27.78）

## 1. 服务器准备

在宝塔“软件商店”安装：

- Nginx
- Node.js 版本管理器，选择 Node.js 20 或 22

安全组和宝塔防火墙只需要开放：

- `80`：当前 IP HTTP 访问
- 宝塔面板端口：限制为你自己的管理 IP
- `22`：SSH，建议限制来源 IP

不要对公网开放应用内部端口。Automatic Assistant 默认改为只监听
`127.0.0.1:3217`。

可以先检查该端口是否空闲：

```bash
ss -lntp | grep ':3217'
```

没有输出就表示当前没有进程监听该端口。

## 2. 上传项目

将整个项目上传到：

```text
/www/wwwroot/automatic-assistant
```

在宝塔终端执行：

```bash
cd /www/wwwroot/automatic-assistant
npm install
npm install --prefix server
npm install --prefix web
npm run build
mkdir -p /www/wwwroot/automatic-assistant-data
chown -R www:www /www/wwwroot/automatic-assistant-data
chmod 700 /www/wwwroot/automatic-assistant-data
```

## 3. 生产环境变量

```bash
cp deploy/server.env.example server/.env
openssl rand -hex 32
```

把生成值写入 `server/.env` 的 `JWT_SECRET`。再填写真实的：

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3217
TRUST_PROXY=1
JWT_SECRET=这里替换为openssl生成的随机值
DATA_DIR=/www/wwwroot/automatic-assistant-data
ADMIN_USERNAME=admin
ADMIN_NAME=系统管理员
ADMIN_PASSWORD=这里设置至少12位的首次管理员密码
DEEPSEEK_API_KEY=你的API密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=你的实际模型标识
```

不要把 `server/.env` 下载、分享或提交到 Git。

## 4. 在宝塔添加 Node 项目

进入“网站 → Node 项目 → 添加 Node 项目”：

- 项目目录：`/www/wwwroot/automatic-assistant`
- 项目名称：`automatic-assistant`
- Node 版本：20 或 22
- 启动方式：`npm`
- 启动命令：`npm start`
- 运行用户：`www`
- 项目端口：`3217`
- 开机启动：开启

如果面板版本要求填写入口文件，使用：

```text
server/src/index.js
```

也可以安装 PM2 后使用 `deploy/ecosystem.config.cjs`：

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
```

不要同时使用宝塔 Node 项目管理和手动 PM2，以免启动两个调度器。

## 5. 配置站点和反向代理

在宝塔中创建站点：

```text
101.43.27.78
```

添加反向代理：

- 代理名称：`automatic-assistant`
- 目标 URL：`http://127.0.0.1:3217`
- 发送域名：`$host`
- 缓存：关闭

或参考 `deploy/baota-nginx.conf` 修改站点 Nginx 配置。

完成后访问：

```text
http://101.43.27.78
```

## 6. 首次上线必须做

1. 使用 `server/.env` 中设置的管理员账号和密码登录。
2. 创建正式成员账号，不会生成开发环境中的演示成员和演示数据。
3. 在模型设置中确认 API Key 和模型标识。
4. 手动运行一项任务，确认 RSS、模型 API 和报告均正常。
5. 备份 `/www/wwwroot/automatic-assistant-data/store.json`。

当前数据文件不适合多个 Node 实例同时写入，所以 PM2 必须保持 `instances: 1`。

## 7. 域名和 HTTPS

仅用 IP 可以先通过 HTTP 测试。正式给核心成员使用前，建议：

1. 将域名解析到 `101.43.27.78`。
2. 在宝塔站点绑定域名。
3. 申请并开启 SSL。
4. 开启强制 HTTPS。

上线后不要继续使用演示密码。
