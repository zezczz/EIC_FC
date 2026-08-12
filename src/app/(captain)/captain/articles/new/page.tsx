import { ArticleEditor } from "@/components/article/article-editor";

export const metadata = { title: "新建文章", robots: { index: false } };

export default function NewArticlePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">新建球队动态</h1>
        <p className="text-muted-foreground text-sm">先保存草稿，再从文章列表发布。</p>
      </div>
      <ArticleEditor />
    </div>
  );
}
