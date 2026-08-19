"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SiteCrest } from "@/components/brand/site-crest";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <SiteCrest className="h-16 opacity-80" />
      <h1 className="text-3xl font-bold">出错了</h1>
      <p className="text-muted-foreground text-sm">服务器开小差了，请稍后重试。</p>
      <Button onClick={reset}>重试</Button>
    </main>
  );
}
