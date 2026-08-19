const MAX_SLUG_LENGTH = 180;

/** 公开路由/API 使用的 slug 归一化，与 slugifyTitle 写入规则对齐 */
export function normalizeArticleSlug(raw: string): string {
  let slug = raw.trim();
  if (slug.includes("%")) {
    try {
      slug = decodeURIComponent(slug);
    } catch {
      // 保留原值，避免非法编码导致抛错
    }
  }
  return slug.normalize("NFKC").trim().toLowerCase();
}

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
