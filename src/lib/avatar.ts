import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { imageFormatForBuffer } from "@/lib/image-signature";
import { uploadsCategoryDir, uploadUrlToPath } from "@/lib/uploads";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_BYTES_LABEL = "2 MB";

const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function avatarPath(filename: string): string {
  return path.join(uploadsCategoryDir("avatars"), filename);
}

export type AvatarCheck =
  | { ok: true; bytes: number }
  | { ok: false; error: string };

export async function validateAvatarFile(file: File): Promise<AvatarCheck> {
  const extension = ALLOWED_AVATAR_TYPES[file.type];
  if (!extension) {
    return {
      ok: false,
      error: "Formato de imagem não suportado (use JPG, PNG, WebP ou GIF).",
    };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return {
      ok: false,
      error: `A imagem deve ter no máximo ${MAX_AVATAR_BYTES_LABEL}.`,
    };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const expectedFormat = extension === "jpg" ? "jpeg" : extension;
  if (imageFormatForBuffer(buffer) !== expectedFormat) {
    return {
      ok: false,
      error: "O arquivo não é uma imagem válida no formato declarado.",
    };
  }
  return { ok: true, bytes: buffer.byteLength };
}

export async function saveAvatarFile(file: File): Promise<string> {
  const extension = ALLOWED_AVATAR_TYPES[file.type];
  if (!extension) {
    throw new Error("Formato de imagem não suportado.");
  }

  const avatarDir = uploadsCategoryDir("avatars");
  await mkdir(avatarDir, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const expectedFormat = extension === "jpg" ? "jpeg" : extension;
  if (imageFormatForBuffer(buffer) !== expectedFormat) {
    throw new Error("Arquivo não é uma imagem válida.");
  }
  await writeFile(avatarPath(filename), buffer);

  return `/uploads/avatars/${filename}`;
}

export function avatarUrlToPath(avatarUrl?: string | null): string | null {
  if (!avatarUrl || !avatarUrl.startsWith("/uploads/avatars/")) return null;
  return uploadUrlToPath(avatarUrl);
}

export async function removeAvatarFile(avatarUrl?: string | null): Promise<void> {
  const filePath = avatarUrlToPath(avatarUrl);
  if (!filePath) return;
  await rm(filePath, { force: true });
}