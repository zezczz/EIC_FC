# 部署指南

域名：`czzczzzez.cloud`

## 中国大陆云服务器（推荐）

1. 购买腾讯云/阿里云大陆轻量服务器（建议 2 核 4GB）
2. 域名实名认证，主体与备案主体一致
3. 向云厂商提交 ICP 备案；备案期间不要解析到大陆服务器
4. 服务器安装 Docker / Compose，复制仓库并配置 `.env`
5. 备案通过后设置 A 记录，启动：

```bash
docker compose -f compose.prod.yml up -d --build
# 迁移
docker compose -f compose.prod.yml run --rm app npx prisma migrate deploy
# 首位队长
docker compose -f compose.prod.yml run --rm -e CAPTAIN_USERNAME=... -e CAPTAIN_EMAIL=... -e CAPTAIN_DISPLAY_NAME=... -e CAPTAIN_PASSWORD=... app npx tsx scripts/bootstrap-captain.ts
```

6. 首页底部填写并展示 ICP 与公安联网备案号
7. 配置每日 `scripts/backup-db.sh` 与每月 `scripts/verify-backup.sh`

## 香港备选

若个人备案无法覆盖注册/接龙交互，改用香港节点。仍需关注内容合规与访问质量。

## 旧电脑

仅建议开发/预览/冷备。使用与生产相同的 Compose；注意 UPS、上行带宽与备案限制。Cloudflare Tunnel 不等于备案。

## 安全组

- 仅开放 80/443
- SSH 限制来源 IP，禁用密码登录
- PostgreSQL 不映射公网
