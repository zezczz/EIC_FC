# API 契约摘要

统一错误：`{ code, message, fieldErrors?, requestId }`

## 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册，返回 PENDING 并建立会话 |
| POST | `/api/auth/callback/credentials` | 登录 |
| POST | `/api/auth/signout` | 退出 |
| GET | `/api/auth/session` | 当前会话 |
| GET | `/api/auth/providers` | 提供方信息 |

## 公开文章

| 方法 | 路径 |
|------|------|
| GET | `/api/articles` |
| GET | `/api/articles/:slug` |

## 队长文章

| 方法 | 路径 |
|------|------|
| GET/POST | `/api/captain/articles` |
| GET/PATCH/DELETE | `/api/captain/articles/:id` |
| POST | `/api/captain/articles/:id/publish\|unpublish\|archive\|pin\|unpin\|restore` |

## 媒体

| 方法 | 路径 |
|------|------|
| POST | `/api/captain/media/presign` |
| POST | `/api/captain/media/complete` |
| DELETE | `/api/captain/media/:id` |
| GET | `/api/media/*` |

## 接龙

| 方法 | 路径 | 权限 |
|------|------|------|
| GET | `/api/relays`、`/api/relays/:id` | ACTIVE 成员 |
| PUT/DELETE | `/api/relays/:id/entry` | ACTIVE 成员 |
| CRUD + open/close/cancel/finish | `/api/captain/relays...` | CAPTAIN |

## 用户审核

| 方法 | 路径 |
|------|------|
| GET | `/api/captain/users` |
| GET | `/api/captain/users/:id` |
| POST | `/api/captain/users/:id/approve\|reject\|suspend\|restore\|role` |

## 审计 / 健康

| 方法 | 路径 |
|------|------|
| GET | `/api/captain/audit` |
| GET | `/api/health/live` |
| GET | `/api/health/ready` |

更完整字段以 Zod schema（`src/schemas/*`）与 `ARCHITECTURE.md` 为准。
