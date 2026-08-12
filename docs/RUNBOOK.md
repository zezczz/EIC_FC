# 运行手册

## 常见故障

| 现象 | 排查 |
|------|------|
| 502 / Bad Gateway | `docker compose -f compose.prod.yml ps`，查 app 日志，确认 `/api/health/ready` |
| 登录无效 | Cookie Secure/域名是否匹配 HTTPS；查 Session 表与用户 status |
| 上传失败 | S3 凭证、bucket、预签名与 complete 校验；看 media 状态 |
| 接龙超卖 | 确认使用事务与 `FOR UPDATE`；查看 RelayEntry 唯一约束 |
| 证书失败 | Caddy 日志、80 是否可达、DNS 是否正确 |

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
