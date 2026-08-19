# 运行手册

## 本地开发一键启动

Windows 推荐使用项目根目录的 [start-dev.cmd](../start-dev.cmd)（双击即可），或在仓库根目录执行：

```powershell
pnpm dev:local
# 或
.\scripts\start-dev.ps1
```

脚本会自动完成：

1. 检查 Node 22+、pnpm、`.env.local`
2. 若 `http://localhost:3000` 已是本项目健康服务，则直接打开浏览器，不重复启动 dev
3. 若端口被其他程序占用，会提示 PID 并停止
4. 启动 Docker Desktop（如未运行）并拉起 PostgreSQL + MinIO
5. 执行 `pnpm db:deploy`
6. 启动 `pnpm dev`，就绪后自动打开浏览器

可选参数：

| 参数           | 说明             |
| -------------- | ---------------- |
| `-SkipDocker`  | 跳过 Docker 启动 |
| `-SkipMigrate` | 跳过数据库迁移   |
| `-SkipBrowser` | 不自动打开浏览器 |
| `-Port 3001`   | 使用其他端口     |

示例：

```powershell
.\scripts\start-dev.ps1 -SkipDocker
.\scripts\start-dev.ps1 -Port 3001
```

### 本地启动常见故障

| 现象                   | 排查                                                       |
| ---------------------- | ---------------------------------------------------------- |
| 端口 3000 被占用       | 脚本会显示 PID；执行 `taskkill /PID <pid> /F` 或关闭旧终端 |
| Docker 未就绪          | 手动打开 Docker Desktop，再重试 `start-dev.cmd`            |
| 页面报 Prisma 字段错误 | 执行 `pnpm prisma generate` 后重启 dev                     |
| 无队长账号             | 执行 `pnpm captain:bootstrap`                              |

### 本地账号从哪来

仓库**不会**自动创建 `captain` / `testmember01`。按来源区分：

| 来源         | 命令                                    | 账号                                  | 用途                                   |
| ------------ | --------------------------------------- | ------------------------------------- | -------------------------------------- |
| 开发种子     | `pnpm db:seed`                          | `devcaptain` / `dev-captain-password` | 空库演示数据；E2E 动态详情依赖此账号   |
| 首位队长     | `pnpm captain:bootstrap`                | 由 `CAPTAIN_*` 环境变量决定           | 正式/首次队长；README 示例为 `captain` |
| 手动验证脚本 | `pnpm tsx scripts/local-verify-flow.ts` | 脚本内写死 `captain`、`testmember01`  | 需事先按该凭据建号，脚本不会创建用户   |

生产环境禁止使用 seed 默认密码。

## 常见故障

| 现象              | 排查                                                                           |
| ----------------- | ------------------------------------------------------------------------------ |
| 502 / Bad Gateway | `docker compose -f compose.prod.yml ps`，查 app 日志，确认 `/api/health/ready` |
| 登录无效          | Cookie Secure/域名是否匹配 HTTPS；查 Session 表与用户 status                   |
| 上传失败          | S3 凭证、bucket、预签名与 complete 校验；看 media 状态                         |
| 接龙超卖          | 确认使用事务与 `FOR UPDATE`；查看 RelayEntry 唯一约束                          |
| 证书失败          | Caddy 日志、80 是否可达、DNS 是否正确                                          |

## 队长账号恢复

1. 确认库中 ACTIVE CAPTAIN 数量
2. 若无队长：在服务器临时注入环境变量运行 `pnpm captain:bootstrap`（仅当不存在 ACTIVE CAPTAIN）
3. 若忘记密码：在受控环境下用脚本重置哈希，强制改密并撤销全部会话

## 备份与恢复

```bash
./scripts/backup-db.sh
./scripts/verify-backup.sh
./scripts/restore-db.sh ./backups/xxx.dump --env staging
```

生产恢复必须 `--env production` 并二次确认。

## 密钥轮换

1. 生成新 `AUTH_SECRET` 前先通知用户重新登录（旧会话哈希将全部失效）
2. 轮换对象存储密钥后同步更新 `.env` 并重建 app
3. 域名/DNS 账号启用 MFA，备份恢复码离线保存
