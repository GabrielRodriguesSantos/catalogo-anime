import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { uploadsCategoryDir, uploadUrlToPath } from "@/lib/uploads";

export const CHAT_MEDIA_LIMITS = {
  image: { maxBytes: 5 * 1024 * 1024, label: "5 MB" },
  audio: { maxBytes: 12 * 1024 * 1024, label: "12 MB" },
  video: { maxBytes: 24 * 1024 * 1024, label: "24 MB" },
  attachment: { maxBytes: 12 * 1024 * 1024, label: "12 MB" },
} as const;

export type ChatMediaKind = keyof typeof CHAT_MEDIA_LIMITS;

type Signature = {
  kind: ChatMediaKind;
  ext: string;
  mime: string;
  test: (head: Buffer) => boolean;
};

const SIGNATURES: Signature[] = [
  { kind: "image", ext: "jpg", mime: "image/jpeg", test: (h) => h.length >= 3 && h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff },
  { kind: "image", ext: "png", mime: "image/png", test: (h) => h.length >= 8 && h.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { kind: "image", ext: "gif", mime: "image/gif", test: (h) => h.length >= 6 && h.subarray(0, 6).equals(Buffer.from("GIF87a")) || h.subarray(0, 6).equals(Buffer.from("GIF89a")) },
  { kind: "image", ext: "webp", mime: "image/webp", test: (h) => h.length >= 12 && h.subarray(0, 4).equals(Buffer.from("RIFF")) && h.subarray(8, 12).equals(Buffer.from("WEBP")) },
  { kind: "audio", ext: "mp3", mime: "audio/mpeg", test: (h) => h.length >= 3 && (h.subarray(0, 3).equals(Buffer.from("ID3")) || (h[0] === 0xff && (h[1] & 0xe0) === 0xe0)) },
  { kind: "audio", ext: "wav", mime: "audio/wav", test: (h) => h.length >= 12 && h.subarray(0, 4).equals(Buffer.from("RIFF")) && h.subarray(8, 12).equals(Buffer.from("WAVE")) },
  { kind: "audio", ext: "ogg", mime: "audio/ogg", test: (h) => h.length >= 4 && h.subarray(0, 4).equals(Buffer.from("OggS")) },
  { kind: "audio", ext: "m4a", mime: "audio/mp4", test: (h) => h.length >= 12 && h.subarray(4, 8).equals(Buffer.from("ftyp")) && (h.subarray(8, 12).equals(Buffer.from("M4A ")) || h.subarray(8, 12).equals(Buffer.from("mp42")) || h.subarray(8, 12).equals(Buffer.from("isom"))) },
  { kind: "video", ext: "webm", mime: "video/webm", test: (h) => h.length >= 4 && h.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
  { kind: "video", ext: "mp4", mime: "video/mp4", test: (h) => h.length >= 12 && h.subarray(4, 8).equals(Buffer.from("ftyp")) && h.subarray(8, 12).equals(Buffer.from("isom")) },
  { kind: "video", ext: "mp4", mime: "video/mp4", test: (h) => h.length >= 12 && h.subarray(4, 8).equals(Buffer.from("ftyp")) && h.subarray(8, 12).equals(Buffer.from("avc1")) },
  { kind: "video", ext: "mov", mime: "video/quicktime", test: (h) => h.length >= 12 && h.subarray(4, 8).equals(Buffer.from("ftyp")) && h.subarray(8, 12).equals(Buffer.from("qt  ")) },
  { kind: "attachment", ext: "pdf", mime: "application/pdf", test: (h) => h.length >= 5 && h.subarray(0, 5).equals(Buffer.from("%PDF-")) },
  { kind: "attachment", ext: "zip", mime: "application/zip", test: (h) => h.length >= 4 && h.subarray(0, 4).equals(Buffer.from("PK\x03\x04")) },
  { kind: "attachment", ext: "txt", mime: "text/plain", test: (h) => h.length >= 4 && !h.some((byte) => byte === 0x00) && isLikelyText(h) },
];

function isLikelyText(head: Buffer): boolean {
  for (const byte of head) {
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d) continue;
    if (byte < 0x20 && byte !== 0x1b) return false;
  }
  return true;
}

export type MediaCheck =
  | { ok: true; kind: ChatMediaKind; ext: string; mime: string }
  | { ok: false; error: string };

async function readHead(file: File): Promise<Buffer> {
  const slice = file.slice(0, 64);
  return Buffer.from(await slice.arrayBuffer());
}

export async function validateChatMedia(file: File): Promise<MediaCheck> {
  if (!file || file.size <= 0) {
    return { ok: false, error: "Arquivo vazio." };
  }

  const head = await readHead(file);
  const signature = SIGNATURES.find((item) => item.test(head));

  if (!signature) {
    return {
      ok: false,
      error:
        "Formato não permitido (imagens JPG/PNG/GIF/WebP, áudio MP3/WAV/OGG/M4A, " +
        "vídeo MP4/WebM/MOV, anexos PDF/ZIP/TXT). Executáveis não são aceitos.",
    };
  }

  const limit = CHAT_MEDIA_LIMITS[signature.kind];
  if (file.size > limit.maxBytes) {
    return {
      ok: false,
      error: `O tamanho máximo para ${kindLabel(signature.kind)} é ${limit.label}.`,
    };
  }

  return { ok: true, kind: signature.kind, ext: signature.ext, mime: signature.mime };
}

function kindLabel(kind: ChatMediaKind): string {
  switch (kind) {
    case "image":
      return "imagens";
    case "audio":
      return "áudios";
    case "video":
      return "vídeos";
    case "attachment":
      return "anexos";
  }
}

export async function saveChatMedia(
  file: File,
  kind: ChatMediaKind,
  ext: string
): Promise<string> {
  const dir = uploadsCategoryDir("chat");
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(/*turbopackIgnore: true*/ dir, filename), buffer);

  return `/uploads/chat/${filename}`;
}

export function chatMediaUrlToPath(mediaUrl?: string | null): string | null {
  if (!mediaUrl || !mediaUrl.startsWith("/uploads/chat/")) return null;
  return uploadUrlToPath(mediaUrl);
}

export async function removeChatMedia(mediaUrl?: string | null): Promise<void> {
  const filePath = chatMediaUrlToPath(mediaUrl);
  if (!filePath) return;
  await rm(filePath, { force: true });
}