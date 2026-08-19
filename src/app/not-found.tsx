import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteCrest } from "@/components/brand/site-crest";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <SiteCrest className="h-16 opacity-80" />
      <h1 className="text-3xl font-bold">页面不存在</h1>
      <p className="text-muted-foreground text-sm">你访问的内容可能已删除或地址有误。</p>
      <Button render={<Link href="/" />}>返回首页</Button>
    </main>
  );
}
