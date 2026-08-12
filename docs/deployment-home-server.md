# 旧电脑自托管备选

仅用于开发、球队内部预览或云服务器冷备，不作为正式主站默认方案。

## 要求

- Ubuntu Server LTS + Docker Compose（与云服务器相同 `compose.prod.yml`）
- BIOS 来电自启、UPS、SMART 告警
- 与家庭设备网络隔离
- 每日备份到云对象存储
- 不暴露数据库、SSH 到公网（或严格限制源 IP）

## 网络优先级

1. Cloudflare Tunnel（测试/低可靠性）
2. 固定公网 IP 且允许 80/443
3. DDNS + 端口映射（最后选择）

注意：家宽可能 CGNAT、封端口、低上行；Tunnel 不等于 ICP 备案，大陆访问质量需实测。
