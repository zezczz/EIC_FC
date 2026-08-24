# 正式上线检查清单（阶段六）

代码与部署产物就绪后，按下列步骤在云厂商侧完成上线。这些步骤需人工操作，无法在仓库内自动完成。

## 1. 服务器与备案

- [ ] 购买大陆轻量云服务器（建议 2 核 4GB）
- [ ] 域名 `czzczzzez.cloud` 完成实名，主体与备案一致
- [ ] 确认公开页已按 [ICP_PERSONAL.md](ICP_PERSONAL.md) 收口后再提交个人备案
- [ ] 提交 ICP 备案；通过前不要把域名解析到大陆服务器
- [ ] 备案通过后办理公安联网备案

## 2. 部署

- [ ] 配置生产 `.env`（AUTH_SECRET、DATABASE、S3、TRUSTED_ORIGINS=https://czzczzzez.cloud）
- [ ] `docker compose -f compose.prod.yml up -d --build`
- [ ] `prisma migrate deploy`
- [ ] `captain:bootstrap` 创建首位队长
- [ ] DNS A 记录指向服务器；www CNAME 到主域名
- [ ] 验证 HTTPS、安全响应头、`/api/health/ready`

## 3. 内容与验收

- [ ] 首页展示 ICP / 公安备案号
- [ ] 未登录首页无招新、无动态列表；未登录访问 `/news` 跳转登录
- [ ] 队长开通队员账号 → 登录 → 看动态 → 接龙报名全流程验收
- [ ] 开启每日备份与每月恢复验证 cron
- [ ] 配置域名/云账号 MFA 与离线恢复码

详见 [DEPLOYMENT.md](DEPLOYMENT.md) 与 [RUNBOOK.md](RUNBOOK.md)。
