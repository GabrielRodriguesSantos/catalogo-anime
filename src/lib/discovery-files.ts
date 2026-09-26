import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { imageFormatForBuffer } from "@/lib/image-signature";
import { uploadsCategoryDir } from "@/lib/uploads";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function validateDiscoveryImage(
  file: File
): Promise<{ ok: true; ext: string } | { ok: false; error: string }> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return { ok: false, error: "Formato de imagem não suportado (JPG, PNG, WebP ou GIF)." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "A imagem deve ter no máximo 10 MB." };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const expectedFormat = ext === "jpg" ? "jpeg" : ext;
  if (imageFormatForBuffer(buffer) !== expectedFormat) {
    return { ok: false, error: "O arquivo não é uma imagem válida no formato declarado." };
  }
  return { ok: true, ext };
}

export async function saveDiscoveryImage(file: File): Promise<string> {
  const check = await validateDiscoveryImage(file);
  if (!check.ok) throw new Error(check.error);

  const dir = uploadsCategoryDir("discovery");
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${check.ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(/*turbopackIgnore: true*/ dir, filename), buffer);

  return `/uploads/discovery/${filename}`;
}

export function isAllowedImageProtocol(raw: string): boolean {
  if (!raw) return false;
  return /^https?:\/\/.+/i.test(raw.trim());
}