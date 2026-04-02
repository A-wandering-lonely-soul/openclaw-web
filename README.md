# OpenClaw Web

OpenClaw 的网页聊天前端，基于 Vue 3 + TypeScript + Vite。

## 功能

- 单页聊天界面，无登录页
- 多会话切换，按 chat_id 隔离上下文
- 删除单条会话时，同时清理该 chat_id 的后端上下文
- 读取并切换后端当前模型
- 清空当前会话上下文
- 本地持久化会话列表与消息记录
- 开发环境通过 Vite 代理转发 /api，避免浏览器跨域
- 界面说明性文案已精简，使用文档承载部署与架构说明

## 静态资源目录

- 背景图目录：`public/static/`
- 构建后访问路径：`/static/*`
- 可将自定义背景图放入该目录，例如 `public/static/anime-bg.jpg`
- 在 `src/style.css` 的 `:root` 中设置 `--anime-bg-image: url('/static/anime-bg.jpg')` 即可启用

## 环境要求

- Node.js 22+
- npm 10+
- OpenClaw 后端已启动，默认地址 http://localhost:8000

## 启动方式

1. 安装依赖

```bash
npm install
```

2. 按需创建环境变量文件

```bash
cp .env.example .env.local
```

3. 启动开发服务器

```bash
npm run dev
```

默认会在 http://localhost:5173 启动。

## 环境变量

- VITE_API_BASE_URL：前端请求前缀，默认 /api
- VITE_API_PROXY_TARGET：开发环境代理目标，默认 http://localhost:8000
- VITE_REQUEST_TIMEOUT_MS：请求超时，默认 120000

## 生产构建

```bash
npm run build
npm run preview
```

当前版本只实现前端项目创建与本地联调，没有接入 openclaw 仓库现有的 Docker Compose、Caddy 或 Nginx 路由。后续如果要生产同域发布，可以再把 dist 或前端容器接入现有反向代理。