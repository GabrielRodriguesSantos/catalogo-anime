import "server-only";

import path from "node:path";

const URL_PREFIX = "/uploads/";

const UPLOAD_CATEGORIES = new Set([
  "avatars",
  "emojis",
  "discovery",
  "chat",
]);

export function uploadsRoot(): string {
  const configured = process.env.UPLOADS_ROOT?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "public", "uploads");
}

export function uploadsCategoryDir(category: string): string {
  return path.join(/*turbopackIgnore: true*/ uploadsRoot(), category);
}

export function uploadUrlToPath(uploadUrl?: string | null): string | null {
  if (!uploadUrl) return null;
  if (!uploadUrl.startsWith(URL_PREFIX)) return null;

  const segments = uploadUrl.slice(URL_PREFIX.length).split("/");
  if (segments.length !== 2) return null;

  const [category, filename] = segments;
  if (!category || !UPLOAD_CATEGORIES.has(category)) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return null;

  const root = path.resolve(/*turbopackIgnore: true*/ uploadsRoot());
  const resolved = path.resolve(/*turbopackIgnore: true*/ root, category, filename);
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
}