# 大陆个人 ICP 备案配套改造

> 状态：已实施  
> 适用范围：域名 `czzczzzez.cloud`、阿里云内地节点、主体为个人（四川）  
> 目标读者：后续改代码、改文案、提交备案的人

本文记录为通过并稳住**个人备案**，代码和公开页必须改哪些地方。未完成前，不要按「球队官网 + 公开招新」去填备案或上线抽查。

完整球队系统（公开招新、公开动态）不在个人备案覆盖范围内。若以后要公开招新，改走[单位备案](#8-不走这条路径时)或香港节点，而不是改回公开入口。

## 1. 已确认的产品决策

个人备案只覆盖「个人非经营性兴趣记录」。抽查看未登录时的页面，不看你私下怎么用接龙。

因此大陆这台机按下面收口：

| 能力 | 决策 |
|---|---|
| 公开招新 / 申请加入 | **关闭**。导航、首页、登录页都不要入口 |
| 球队动态 | **仅已审核队员**可见 |
| 球队介绍 `/team` | **仅已审核队员**可见 |
| 活动接龙、队员名册 | 维持现状：仅已审核队员 |
| 登录 | 保留。给已有账号使用 |
| 新队员怎么进来 | 队长私下告知后开账号，见 [第 5 节](#5-队员如何加入代码缺口) |

备案材料与公开页必须一致。建议备案网站名称用 `绿茵随记`（或 `周末绿茵` / `球场随笔`），不要用 hust、EIC FC、电信足球队、官网、网站、新闻。

## 2. 改造后谁能看见什么

| 路径 | 现在 | 改完后 |
|---|---|---|
| `/` | 公开：队名、招新、置顶/最新动态 | 公开：个人兴趣站首页，无招新、无动态列表 |
| `/login` | 公开 | 公开，文案不要写「申请加入球队」 |
| `/register` | 公开招新 | 关闭页面和接口，或改为仅队长邀请 |
| `/news` `/news/[slug]` | 公开 | 未登录 → `/login`；非 ACTIVE → `/pending` |
| `/team` | 公开 | 同上，纳入会员区 |
| `/relay` `/members` `/account` | 已是会员区 | 不变 |
| `/captain/*` | 队长 | 不变 |
| `GET /api/articles` `GET /api/team` | 公开 | 要求已登录 ACTIVE |
| `POST /api/auth/register` | 公开可调 | 关闭，或校验邀请码 |

未登录打开会员页时，统一跳登录，不要 404 一块空白。

## 3. 代码与文案修改清单

按文件改。未列出的文件默认不动。

### 3.1 路由守卫（必做）

把动态和球队介绍收进会员区，复用现有 `(member)/layout.tsx`（未登录 → `/login`，非 ACTIVE → `/pending`）。

可选做法（二选一，推荐 A）：

- **A.** 把 `src/app/news/`、`src/app/news/[slug]/`、`src/app/team/` 移到 `src/app/(member)/` 下，URL 仍是 `/news`、`/team`（Route Group 不进 URL）。
- **B.** 三个 `page.tsx` 开头自行 `getSessionUser()` 并 `redirect`，与会员区规则保持一致。

相关文件：

- `src/app/news/page.tsx`
- `src/app/news/[slug]/page.tsx`
- `src/app/team/page.tsx`
- `src/app/(member)/layout.tsx`

详情页 `generateMetadata` 对未登录不要输出文章标题/摘要，避免未登录也能从 HTML 里读到内容。

### 3.2 首页：去掉招新和动态流（必做）

`src/app/page.tsx`

- 删除「申请加入」按钮（链到 `/register`）。
- 删除「浏览球队动态 / 查看全部」及置顶、最新动态列表。未登录不应看到任何文章卡片。
- 未登录主文案改成个人兴趣记录，例如：个人业余足球训练与比赛心得。不要写「官方网站」「招新」「申请加入」「华科 / hust 电信足球队」。
- 已登录且 ACTIVE 可保留「进入球队动态」链到 `/news`，这不算公开招新。
- 队名、副标题若仍从 `getTeamProfile()` 读库，上线前把库里的 `name` / `subtitle` / `summary` 改成与备案名一致（见 [第 6 节](#6-内容与备案材料对齐)）。不要在未登录首页继续展示组织向队名。

### 3.3 导航与页脚（必做）

`src/components/site-header-bar.tsx`

- `publicLinks` 清空或只保留首页。未登录不要出现「球队介绍」「球队动态」「注册 / 申请加入」。
- 「球队介绍」「球队动态」移入 `memberLinks`（仅 ACTIVE）。
- 未登录只保留「登录」。删除桌面端和移动端的注册按钮。

`src/components/site-footer.tsx`

- 页脚站名改为备案网站名称（如「绿茵随记」），不要只写 `EIC FC`。
- 备案通过后填写 ICP 号，链接 `https://beian.miit.gov.cn/`。
- 版权行不要写「球队官网」。

`src/app/layout.tsx`

- `metadata.title.default`、`description`、`applicationName`、`openGraph.siteName` 改为个人站表述，例如标题「绿茵随记」，描述「个人业余足球训练与比赛心得记录」。
- 去掉「官方网站」「队员交流」「活动接龙」等对外宣传语。

### 3.4 关闭公开注册（必做）

现在没有「队长直接开账号」接口，只关入口不够，爬虫仍能打到 `/register` 和 `POST /api/auth/register`。

必须同时做：

1. 去掉所有公开链到 `/register` 的入口：  
   `src/app/page.tsx`、`src/components/site-header-bar.tsx`、`src/app/(auth)/login/page.tsx`
2. `src/app/(auth)/register/page.tsx`：未持有效邀请时重定向到 `/login`，或整页不再提供自助注册。
3. `src/app/api/auth/register/route.ts`：拒绝无邀请的公开注册（401/403）。不要只靠「不链过去」。
4. 补上队员开通方式，见 [第 5 节](#5-队员如何加入代码缺口)。

### 3.5 API 与 SEO（必做）

未登录不应再列出文章和球队资料。

- `src/app/api/articles/route.ts`：`listPublicArticles` 前要求 ACTIVE 会话。
- `src/app/api/team/route.ts`：同样要求 ACTIVE。
- 文章详情若有公开 GET API，一并加守卫（以 `docs/API.md` 为准逐条核对）。
- `src/app/sitemap.ts`：只保留首页。删除 `/news`、`/team` 及全部文章 URL。
- `src/app/robots.ts`：`allow` 只留 `/`（媒体若仅登录后使用，不要再 allow `/api/media/` 给搜索引擎）。`disallow` 增加 `/news/`、`/team`、`/register`。

登录后的动态仍可用现有 URL `/news/...`，只是不进 sitemap、不对搜索引擎开放。

### 3.6 后台文案（建议）

队长预览里「公开地址：`/news/{slug}`」改为「队员可见地址」，避免误以为对外公开：

- `src/app/(captain)/captain/articles/[id]/edit/page.tsx`
- `src/app/(captain)/captain/articles/[id]/preview/page.tsx`

### 3.7 种子与测试数据（必做）

`prisma/seed.ts` 里若有「球队官网已上线，欢迎浏览动态并申请加入」一类摘要，改成个人记录表述，不要再引导公开加入。

## 4. 测试要改

现有用例按「公开动态 + 公开注册」写，不改会红。

| 文件 | 要改的点 |
|---|---|
| `tests/e2e/smoke.spec.ts` | 首页不应再出现「申请加入」；未登录访问 `/register` 应失败或跳转 |
| `tests/e2e/article-detail.spec.ts` | 未登录访问 `/news`、`/news/{slug}` 应到登录页；ACTIVE 队员才能看到正文 |
| 注册相关 unit/integration/e2e | 无邀请的 `POST /api/auth/register` 必须失败 |
| 公开文章 API 测试 | 未登录 `GET /api/articles`、`GET /api/team` 必须失败 |

补三条验收：

1. 无 Cookie 打开 `/`：无招新、无文章列表、无 hust/官方/申请加入。
2. 无 Cookie 打开 `/news`、`/team`：跳转 `/login`。
3. 搜索引擎视角：`/sitemap.xml` 不含文章；`robots.txt` 不允许 `/news/`。

## 5. 队员如何加入（代码缺口）

关掉公开注册后，必须有替代，否则只有 `captain:bootstrap` 那一个队长账号。

推荐实现（选一个，写入实现时再改 `docs/API.md`）：

1. **队长后台「添加队员」**（优先）：队长填写用户名、显示名、初始密码，直接创建 `ACTIVE` 用户，线下把账号发给队友。
2. **一次性邀请码**：`/register?invite=...` 持有效码才能提交；码由队长生成、可作废。公开无参注册仍然关闭。

不要用「注册页保留但不放链接」。抽查和脚本都能直接打开 `/register`。

队长审核（`PENDING` → `ACTIVE`）可以保留，给邀请注册用；若只做后台直接开 `ACTIVE` 账号，审核流不是公开招新所必需。

## 6. 内容与备案材料对齐

代码改完后，**线上展示名必须等于备案网站名称**。抽查对的是浏览器里看到的字，不是仓库里的设计稿。

| 位置 | 建议 |
|---|---|
| 备案网站名称 | `绿茵随记` |
| 备案网站内容 | 仅「其他」 |
| 备案网站语言 | 仅「中文简体」 |
| 备案备注 | 本网站为个人非经营性网站，用于记录个人业余足球训练与比赛心得，不发布社会新闻，不开展商业交易，也不提供论坛社区服务。 |
| 首页 H1 / 页脚站名 | 与备案名称相同 |
| 球队资料 `name`（队长后台） | 未登录不可见；登录后对内可用 EIC FC。不要在公开 HTML 里出现 hust、华科官方、招新 |

备案期间仍然不要把域名解析到大陆 IP。通过后再挂 ICP 号，并办公安联网备案。

## 7. 建议同步的文档

本文是改造清单。落地后应回写下列文档，避免和「公开展示动态 / 公开注册」旧描述打架：

- `docs/ARCHITECTURE.md` §1 目标、§2 范围、公开文章、备案用语、阶段六
- `docs/PROJECT_STRUCTURE.md` 路由可见性表
- `docs/API.md` 注册接口、公开文章/球队接口的鉴权
- `docs/GO_LIVE.md` 去掉「向接入商确认球队官网 + 注册审核 + 接龙」；验收改为「未登录看不到动态和招新」
- `docs/DEPLOYMENT.md` 香港备选改为：若要恢复公开招新，再迁香港或改单位备案

## 8. 不走这条路径时

| 需求 | 做法 |
|---|---|
| 继续个人备案 + 大陆机 | 按本文改完再提交/等抽查 |
| 又要公开招新、又要大陆 IP | 个体户或公司 **单位备案**，不走个人 |
| 功能全留、不办证 | 迁香港/境外节点，域名不解析到大陆机，无需 ICP |

不要用「备案填个人兴趣站、上线后再打开公开招新」。抽查会对不上，可能被责令整改或断开接入。
