const MAX_SLUG_LENGTH = 180;

export function slugifyTitle(title: string): string {
  const normalized = title
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return normalized || "team-update";
}

export async function createUniqueSlug(
  title: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugifyTitle(title);
  if (!(await exists(base))) return base;

  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const tail = `-${suffix}`;
    const candidate = `${base.slice(0, MAX_SLUG_LENGTH - tail.length)}${tail}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error("无法生成唯一文章地址");
}
