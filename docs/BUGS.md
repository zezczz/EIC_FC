# Bug 记录

## BUG-001 动态详情页显示「页面不存在」

| 字段     | 内容                          |
| -------- | ----------------------------- |
| 状态     | 已修复                        |
| 发现时间 | 2026-08-19                    |
| 影响范围 | 公开动态详情页 `/news/[slug]` |
| 严重程度 | 高                            |

### 现象

- 首页或 `/news` 列表能看到已发布动态卡片。
- 点击进入详情页后，页面主体显示「页面不存在 / 你访问的内容可能已删除或地址有误。」
- 同一篇文章的公开 API `GET /api/articles/{slug}` 可能返回 200。

### 稳定复现（开发环境）

1. 启动开发栈：`pnpm docker:dev:up`，宿主机运行 `pnpm dev`。
2. 队长创建并发布一篇中文标题动态，例如 `本地验证测试新闻-2`。
3. 访问 `http://localhost:3000/news/{slug}`。
4. 观察到 metadata 标题正确，但正文为全局 404。

### 现场证据

- 运行方式：PostgreSQL/MinIO 在 Docker，Next.js 在宿主机 `localhost:3000`。
- 示例 slug：`本地验证测试新闻-2`。
- `GET /api/articles/本地验证测试新闻-2` → 200。
- 页面 HTML 含 `NEXT_HTTP_ERROR_FALLBACK;404`，栈指向 `NewsDetailPage` 的 `notFound()`。
- 此前仅增加 `force-dynamic` 与 `revalidatePath("/news/[slug]", "page")` **未能单独解决**。

### 根因

1. **详情页存在冗余且不一致的查询守卫**：`generateMetadata` 用 `findFirst` 能查到文章，但页面组件额外执行 `db.article.count()`，在中文 slug 场景下错误返回 0 并触发 `notFound()`，而 `getPublicArticle()` 实际可正常返回数据。
2. **slug 归一化未统一**：页面、metadata、API 对动态路由 slug 的处理不一致，存在 percent-encoded 与 NFKC 归一化缺口。

### 修复方案

1. 新增 `normalizeArticleSlug()`（[`src/server/articles/slug.ts`](src/server/articles/slug.ts)），页面、metadata、API 共用。
2. 移除详情页冗余 `count()` 守卫，统一通过 `getPublicArticle()` 加载；仅 `NOT_FOUND` 映射为 `notFound()`。
3. 查无记录时写结构化 warning 日志（原始 slug、归一化 slug）。
4. 保留 `export const dynamic = "force-dynamic"` 与 `revalidatePath("/news/[slug]", "page")`。

### 回归测试

- [`tests/unit/slug.test.ts`](tests/unit/slug.test.ts)：中文/ASCII/encoded slug 归一化。
- [`tests/integration/article-flow.test.ts`](tests/integration/article-flow.test.ts)：中文 slug 创建、发布、公开读取。
- [`tests/e2e/article-detail.spec.ts`](tests/e2e/article-detail.spec.ts)：发布后从列表点击进入详情，断言无 404。

### 验证记录

- 修复后需确认：API 200、页面标题与正文正常、列表卡片可点击进入详情。
- 若 Vitest/Playwright 因 Node 18 无法启动，以浏览器手动复现作为关键验收。
