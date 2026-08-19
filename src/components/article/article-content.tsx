import { cn } from "@/lib/utils";
import { renderArticleContent } from "@/server/articles/renderer";

export function ArticleContent({ content, className }: { content: unknown; className?: string }) {
  const html = renderArticleContent(content);
  return (
    <div
      className={cn(
        "[&_a]:text-primary [&_pre]:bg-muted [&_blockquote]:border-primary max-w-none text-base leading-8 [&_a]:underline [&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_code]:font-mono [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-bold [&_img]:my-6 [&_img]:w-full [&_img]:rounded-xl [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-5 [&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
