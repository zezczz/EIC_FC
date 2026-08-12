# 正式上线检查清单（阶段六）

代码与部署产物就绪后，按下列步骤在云厂商侧完成上线。这些步骤需人工操作，无法在仓库内自动完成。

## 1. 服务器与备案

- [ ] 购买大陆轻量云服务器（建议 2 核 4GB）
- [ ] 域名 `czzczzzez.cloud` 完成实名，主体与备案一致
- [ ] 向接入商确认「球队官网 + 注册审核 + 接龙」是否符合个人备案
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
- [ ] 发布一篇球队动态并在手机端检查排版
- [ ] 注册 → 审核 → 接龙报名全流程验收
- [ ] 开启每日备份与每月恢复验证 cron
- [ ] 配置域名/云账号 MFA 与离线恢复码

详见 [DEPLOYMENT.md](DEPLOYMENT.md) 与 [RUNBOOK.md](RUNBOOK.md)。
