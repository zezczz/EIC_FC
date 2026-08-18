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

文章创建/更新字段：`title`、`subtitle`、`summary`、`contentJson`（TipTap JSON）、`coverUrl`（外部 `https://` 图床封面，推荐）、`coverAssetId`（旧版站内封面，兼容只读）。

正文图片必须使用公开 `https://` 图床 URL 并填写 `alt`；支持在后台编辑器导入 `.md` 文件，导入时会拒绝本地路径、HTTP 与 base64 图片。

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
| CRUD + open/close/reopen/cancel/uncancel/finish/export | `/api/captain/relays...` | 具备 `relays:write` |

报名字段：`response`（JOINED/DECLINED）、`participantCount`（含本人，1-20）、`companionNames`（同行人员姓名，数量必须等于 `participantCount - 1`）、`note`。

Excel 导出包含「活动信息」「正式参加名单」「候补名单」「报名明细」四个工作表；已取消/已完成且未软删除的接龙也可导出。

取消活动可通过 `POST /api/captain/relays/:id/uncancel` 恢复为 `CLOSED`（保留报名数据，需队长再次 reopen 才会开放报名）。

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
