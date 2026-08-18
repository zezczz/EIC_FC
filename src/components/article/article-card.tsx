import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { resolveArticleCoverUrl } from "@/lib/external-image";

export type ArticleCardData = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  publishedAt: Date | null;
  pinnedAt: Date | null;
  coverUrl?: string | null;
  coverAsset: { storageKey: string; mimeType: string } | null;
};

/**
 * 文章卡片（ARCHITECTURE.md §13：统一封面比例）。
 */
export function ArticleCard({ article, rank }: { article: ArticleCardData; rank?: number }) {
  const coverSrc = resolveArticleCoverUrl(article);

  return (
    <Link href={`/news/${article.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="bg-muted aspect-[16/10] w-full overflow-hidden">
          {coverSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc}
              alt={article.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-muted-foreground/30 flex h-full items-center justify-center text-3xl font-black">
              EIC
            </div>
          )}
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            {article.pinnedAt && <Badge variant="secondary">置顶</Badge>}
            {rank !== undefined && <Badge variant="outline">TOP {rank}</Badge>}
          </div>
          <CardTitle className="line-clamp-2 text-base leading-snug group-hover:underline">
            {article.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-muted-foreground line-clamp-2 text-sm">{article.summary}</p>
          {article.publishedAt && (
            <p className="text-muted-foreground/80 mt-2 text-xs">
              {formatDate(article.publishedAt)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
