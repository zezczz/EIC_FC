export function isExternalHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function assertExternalHttpsUrl(value: string, label = "链接"): string {
  const trimmed = value.trim();
  if (!isExternalHttpsUrl(trimmed)) {
    throw new Error(`${label}必须是公开可访问的 https:// 地址`);
  }
  return trimmed;
}

export const LEGACY_MEDIA_IMAGE_PATH = /^\/api\/media\/[A-Za-z0-9/_-]+\.(?:jpe?g|png|webp)$/i;

export function isAllowedArticleImageSrc(value: string): boolean {
  const trimmed = value.trim();
  return isExternalHttpsUrl(trimmed) || LEGACY_MEDIA_IMAGE_PATH.test(trimmed);
}

export function resolveArticleCoverUrl(input: {
  coverUrl?: string | null;
  coverAsset?: { storageKey: string } | null;
}): string | null {
  if (input.coverUrl) return input.coverUrl;
  if (input.coverAsset?.storageKey) return `/api/media/${input.coverAsset.storageKey}`;
  return null;
}
