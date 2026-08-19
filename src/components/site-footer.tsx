import Link from "next/link";
import { SiteCrest } from "@/components/brand/site-crest";

export function SiteFooter() {
  return (
    <footer className="border-sideline bg-card mt-auto border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-4 py-8 text-center">
        <Link href="/" className="flex items-center gap-2">
          <SiteCrest className="h-8" decorative />
          <span className="font-brand text-lg tracking-wide">EIC FC</span>
        </Link>
        <p className="text-muted-foreground text-xs">© {new Date().getFullYear()} EIC FC</p>
        <p className="text-muted-foreground text-xs">
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            备案号：ICP备案号待填写
          </a>
        </p>
        <p className="text-muted-foreground text-xs">公安联网备案号待填写</p>
      </div>
    </footer>
  );
}
