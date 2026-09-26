import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/config";
import { decrypt } from "@/lib/token";
import { uploadUrlToPath } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  m4a: "audio/mp4",
  webm: "video/webm",
  mp4: "video/mp4",
  mov: "video/quicktime",
  pdf: "application/pdf",
  zip: "application/zip",
  txt: "text/plain; charset=utf-8",
};

const NOT_FOUND = new NextResponse("Não encontrado", { status: 404 });

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NOT_FOUND;

  const { slug } = await context.params;
  if (!Array.isArray(slug) || slug.length === 0) return NOT_FOUND;

  const filePath = uploadUrlToPath(`/uploads/${slug.join("/")}`);
  if (!filePath) return NOT_FOUND;

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return NOT_FOUND;
  } catch {
    return NOT_FOUND;
  }

  const buffer = await fs.readFile(filePath).catch(() => null);
  if (!buffer) return NOT_FOUND;

  const ext = path.extname(filePath).slice(1).toLowerCase();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}