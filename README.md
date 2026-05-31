# 兜兜有钱 v2

微信小程序 AI 记账应用。支持语音录入账单，通过豆包大模型自动解析金额、分类、日期，一句话完成记账。

---

## 功能特性

- 微信一键登录，数据隔离
- 语音记账：录音 → ASR 转文字 → LLM 解析 → 批量创建账单
- 多账户管理，余额自动更新
- 账单列表 / 日历视图 / 月度统计
- 自定义分类与标签

## 技术栈

| 层级 | 技术 |
|------|------|
| 小程序前端 | Taro 4 + React 18 + TypeScript + Zustand |
| 后端 API | NestJS + Prisma ORM + MySQL |
| AI 语音识别 | 豆包 ASR（火山引擎大模型录音文件识别） |
| AI 文本解析 | 豆包 LLM（火山方舟，OpenAI 兼容格式） |
| 基础设施 | Docker Compose + Nginx + GitHub Actions |
| 包管理 | pnpm 11 monorepo |

## 项目结构

```
.
├── apps/
│   ├── api/          # NestJS 后端
│   └── miniapp/      # Taro 小程序
├── packages/
│   └── shared/       # 共享类型
├── nginx/            # Nginx 配置
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## 本地开发

### 环境要求

- Node.js >= 18
- pnpm >= 11
- MySQL 8.0
- 微信开发者工具

### 启动步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp apps/api/.env.example apps/api/.env
# 填写 .env 中的微信、数据库、LLM、ASR 密钥

# 3. 初始化数据库
cd apps/api
pnpm prisma migrate dev --name init
pnpm prisma db seed

# 4. 启动后端
pnpm --filter api dev

# 5. 构建小程序（另开终端）
pnpm --filter miniapp dev:weapp
```

用微信开发者工具导入 `apps/miniapp/dist` 目录，AppID 填 `wxf979ecffe6e916fd`。

### 环境变量说明

| 变量 | 说明 |
|------|------|
| `WECHAT_APP_ID` | 微信小程序 AppID |
| `WECHAT_APP_SECRET` | 微信小程序 AppSecret |
| `DATABASE_URL` | MySQL 连接串 |
| `JWT_SECRET` | JWT 签名密钥 |
| `LLM_API_KEY` | 火山方舟 API Key |
| `LLM_MODEL` | 豆包模型端点 ID |
| `ASR_API_KEY` | 火山引擎语音识别 API Key |
| `ASR_RESOURCE_ID` | ASR 资源 ID（默认 `volc.seedasr.auc`） |
| `SERVER_BASE_URL` | 服务器公网地址（ASR 音频回调用） |

## 生产部署

```bash
# 服务器上执行
docker compose up -d
```

GitHub Actions 在推送到 `main` 分支时自动构建并 SSH 部署。

## API 文档

接口契约见 `AI文档/OpenAPI.yaml`，遵循统一响应格式：

```json
{ "code": 0, "message": "ok", "data": {}, "traceId": "..." }
```
