# 项目文件地图

这份文档只解释「文件是什么、能不能删」。业务规则见 [ARCHITECTURE.md](ARCHITECTURE.md)，本地启动与故障见 [RUNBOOK.md](RUNBOOK.md)。

约定：

- **手工维护**：改代码或文档时要一起改，提交到 Git。
- **生成物**：由命令产生，不要提交；删了可以再生成。
- **本地工具目录**：给 Cursor / Claude / Windsurf 用，不是网站源码。

## 先看这里

| 路径                                | 是什么                              | 能否删除                               |
| ----------------------------------- | ----------------------------------- | -------------------------------------- |
| `src/`                              | 网站源码（页面、API、业务逻辑、UI） | 否                                     |
| `prisma/`                           | 数据库模型和迁移                    | 否                                     |
| `tests/`                            | 单元 / 集成 / E2E 测试              | 否                                     |
| `scripts/`                          | 开发、部署、备份脚本                | 否                                     |
| `docs/`                             | 项目文档                            | 否                                     |
| `public/`                           | 静态资源（队徽等）                  | 否                                     |
| `package.json`                      | 依赖和常用命令                      | 否                                     |
| `.env.example`                      | 环境变量模板                        | 否                                     |
| `.env` / `.env.local` / `.env.test` | 本机密钥                            | 不要提交；本地可重建                   |
| `node_modules/`                     | 依赖安装结果                        | 可删，再执行 `pnpm install`            |
| `.next/`                            | Next.js 构建缓存                    | 可删，再执行 `pnpm dev` / `pnpm build` |
| `src/generated/`                    | Prisma Client                       | 可删，再执行 `pnpm db:generate`        |
| `next-env.d.ts`                     | Next 生成的类型声明                 | 可删，启动 `pnpm dev` 会再生           |
| `AGENTS.md`                         | `next dev` 写入的 Next.js 16 规则   | 可随 `next dev` 更新                   |
| `.agents/` `.claude/` `.windsurf/`  | 多 IDE 的 Agent Skills              | 应用运行不依赖它们                     |
| `.cursor/`                          | Cursor 本地日志等                   | 日志可删                               |
| `skills-lock.json`                  | Skills 来源锁定                     | 保留                                   |

克隆后先装 Node.js **22+**，再执行 `pnpm install` 和 `pnpm db:generate`。没有 `src/generated/prisma` 时，类型检查会失败。

## 根目录常见文件

| 文件                                     | 用途                                                                |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `README.md`                              | 入口：如何启动、文档索引                                            |
| `AGENTS.md`                              | Next.js 16 自动生成的 agent 规则，不是产品文档                      |
| `next.config.ts`                         | Next.js 配置（standalone 输出、安全头）                             |
| `prisma.config.ts`                       | Prisma 7 CLI 配置                                                   |
| `postcss.config.mjs`                     | Tailwind CSS 4 通过 PostCSS 接入，**没有** `tailwind.config.ts`     |
| `components.json`                        | shadcn/ui 配置；其中 `hooks` 别名指向 `@/hooks`，当前仓库没有该目录 |
| `compose.dev.yml`                        | 本地 PostgreSQL + MinIO                                             |
| `compose.prod.yml`                       | 生产 Caddy + app + PostgreSQL                                       |
| `Caddyfile`                              | 生产 HTTPS 入口                                                     |
| `Dockerfile`                             | 生产镜像                                                            |
| `start-dev.cmd`                          | Windows 双击启动，转调 `scripts/start-dev.ps1`                      |
| `pnpm-workspace.yaml`                    | pnpm 构建白名单，**不是** monorepo                                  |
| `eslint.config.mjs` / `.prettierrc.json` | 代码检查与格式化                                                    |

## `src/` 源码

```text
src/
├─ app/          路由：页面与 API
├─ components/   React 组件
├─ server/       服务端业务与基础设施
├─ schemas/      Zod 请求/表单校验
├─ lib/          纯工具（标签、格式化、颜色）
└─ generated/    Prisma 生成代码，勿手改
```

### 页面路由（`src/app`）

括号目录是 Route Group，**不出现在 URL 里**。

| 分组 / 路径          | URL 示例                           | 谁能看               |
| -------------------- | ---------------------------------- | -------------------- |
| 公开页               | `/` `/login`                       | 所有人               |
| `(auth)`             | `/login`；`/register` 重定向登录   | 未登录               |
| `pending`            | `/pending`                         | 遗留待审核账号       |
| `(member)`           | `/news` `/team` `/account` `/relay` `/members` | 已审核队员 |
| `(captain)/captain/` | `/captain/...`                     | 队长后台             |

代码里「文章」对应产品用语「球队动态」，队员 URL 用 `/news`，API 用 `/api/articles`。未登录不可见。成员列表用 `/members`，队长开通/审核接口用 `/api/captain/users`。

### 服务端（`src/server`）

| 目录                                   | 职责                              |
| -------------------------------------- | --------------------------------- |
| `auth/`                                | 会话、密码、权限守卫              |
| `articles/`                            | 球队动态                          |
| `relays/`                              | 活动接龙                          |
| `users/`                               | 成员资料与队长审核                |
| `team/`                                | 球队介绍                          |
| `media/`                               | 图片与对象存储                    |
| `audit/`                               | 审计日志                          |
| `db.ts` `env.ts` `http.ts` `logger.ts` | 数据库、环境变量、HTTP 响应、日志 |

`src/app/api/**/route.ts` 只负责解析请求、鉴权、调用 `server/`、返回 JSON。

### 组件（`src/components`）

| 目录                                                      | 职责               |
| --------------------------------------------------------- | ------------------ |
| `ui/`                                                     | shadcn/ui 基础组件 |
| `brand/`                                                  | 队徽、页头         |
| `article/` `relay/` `captain/` `account/` `auth/` `team/` | 各业务 UI          |

## `prisma/`

| 路径            | 用途                                    |
| --------------- | --------------------------------------- |
| `schema.prisma` | 数据模型                                |
| `migrations/`   | 迁移历史，不要手改已提交的 SQL          |
| `seed.ts`       | **仅开发**演示数据，会创建 `devcaptain` |

生产队长用 `pnpm captain:bootstrap`，不要跑 seed。

## `tests/`

| 目录           | 命令                    | 说明                                           |
| -------------- | ----------------------- | ---------------------------------------------- |
| `unit/`        | `pnpm test`             | 不连真实数据库                                 |
| `integration/` | `pnpm test:integration` | 需要本地 PostgreSQL；会 `migrate reset` 测试库 |
| `e2e/`         | `pnpm test:e2e`         | Playwright；动态详情用例依赖 seed 队长         |

`pnpm check` 包含格式、lint、类型、单测、集成测试和构建，**不含** E2E。CI 会额外跑 E2E。

## `scripts/`

| 脚本                                              | 何时用                                                      |
| ------------------------------------------------- | ----------------------------------------------------------- |
| `start-dev.ps1`                                   | Windows 一键本地开发（`pnpm dev:local` 或 `start-dev.cmd`） |
| `bootstrap-captain.ts`                            | 创建首位队长                                                |
| `cleanup.ts`                                      | 清理过期会话等；默认 dry-run，加 `--apply` 才删除           |
| `local-verify-flow.ts`                            | 手动打本地 API；账号需事先存在                              |
| `cloudflare-tunnel-setup.ps1`                     | 旧电脑经 Cloudflare Tunnel 暴露预览                         |
| `backup-db.sh` `restore-db.sh` `verify-backup.sh` | 数据库备份与恢复                                            |
| `deploy.sh` `healthcheck.sh`                      | 生产部署与健康检查                                          |

## `docs/`

| 文件                        | 内容               |
| --------------------------- | ------------------ |
| `PROJECT_STRUCTURE.md`      | 本文：文件地图     |
| `ARCHITECTURE.md`           | 产品与架构契约     |
| `API.md`                    | HTTP API 摘要      |
| `DEPLOYMENT.md`             | 大陆云部署         |
| `GO_LIVE.md`                | 上线检查清单       |
| `RUNBOOK.md`                | 日常运维、本地启动 |
| `deployment-home-server.md` | 旧电脑自托管       |
| `BUGS.md`                   | 已记录缺陷与回归   |

## 工具目录（不是网站代码）

`.agents/skills`、`.claude/skills`、`.windsurf/skills` 是同一套 Prisma / 设计 Skills 的多工具副本，由根目录 `skills-lock.json` 锁定来源。格式化和 Docker 构建会忽略它们。日常改功能时不必打开这些目录。
