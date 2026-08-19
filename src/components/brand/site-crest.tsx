import { cn } from "@/lib/utils";

const sources = {
  full: "/brand/crest-full.png",
  shield: "/brand/crest-shield.png",
} as const;

export function SiteCrest({
  variant = "full",
  className,
  decorative = false,
}: {
  variant?: keyof typeof sources;
  className?: string;
  decorative?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources[variant]}
      alt={decorative ? "" : "EIC FC 队徽"}
      className={cn("h-9 w-auto select-none", className)}
    />
  );
}
