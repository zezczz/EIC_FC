import { ArticleEditor } from "@/components/article/article-editor";
import { PageHeader } from "@/components/brand/page-header";
import { requirePermission } from "@/server/auth/guards";
import { PERMISSIONS } from "@/server/auth/permissions";

export const metadata = { title: "新建文章", robots: { index: false } };

export default async function NewArticlePage() {
  await requirePermission(PERMISSIONS.ARTICLES_WRITE);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Newsroom"
        title="新建球队动态"
        description="先保存草稿，再从文章列表发布。"
      />
      <ArticleEditor />
    </div>
  );
}
