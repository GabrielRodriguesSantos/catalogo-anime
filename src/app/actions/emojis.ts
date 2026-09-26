"use server";

import { randomUUID } from "node:crypto";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { uploadsCategoryDir, uploadUrlToPath } from "@/lib/uploads";

const EMOJI_IMAGE_RE = /^\/uploads\/emojis\/[a-zA-Z0-9-]+\.(png|webp)$/;

function isSafeEmojiImagePath(imagePath: string): boolean {
  return EMOJI_IMAGE_RE.test(imagePath) && uploadUrlToPath(imagePath) !== null;
}

export type EmojiaResult =
  | { ok: true; id?: string; imagePath: string; name: string; pendingPath?: string }
  | { ok: false; error: string };

function isEmojiaConfigured(): boolean {
  return Boolean(process.env.EMOJIA_API_URL);
}

async function fetchEmojiaImage(prompt: string): Promise<Buffer | null> {
  const apiUrl = process.env.EMOJIA_API_URL;
  if (!apiUrl) return null;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(process.env.EMOJIA_API_KEY
      ? { authorization: `Bearer ${process.env.EMOJIA_API_KEY}` }
      : {}),
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(40_000),
    cache: "no-store",
  });

  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("image/")) return null;

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength === 0 || buffer.byteLength > 2 * 1024 * 1024) return null;
  if (!looksLikePngOrWebp(buffer)) return null;
  return buffer;
}

function looksLikePngOrWebp(buffer: Buffer): boolean {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return true;
  }
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).equals(Buffer.from("RIFF")) &&
    buffer.subarray(8, 12).equals(Buffer.from("WEBP"))
  );
}

function isPng(buffer: Buffer): boolean {
  return buffer.subarray(0, 8).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  );
}

export async function generateEmoji(
  _prev: EmojiaResult | null,
  formData: FormData
): Promise<EmojiaResult> {
  await requireUser();

  const prompt = String(formData.get("prompt") ?? "").trim().slice(0, 200);
  if (!prompt) return { ok: false, error: "Descreva o emoji que quer gerar." };

  if (!isEmojiaConfigured()) {
    return {
      ok: false,
      error:
        "A geração de emojis por IA (emojIA) não está configurada neste servidor. " +
        "Defina EMOJIA_API_URL (e opcionalmente EMOJIA_API_KEY) para ativá-la.",
    };
  }

  const buffer = await fetchEmojiaImage(prompt).catch(() => null);
  if (!buffer) {
    return {
      ok: false,
      error:
        "emojIA não conseguiu gerar a imagem. " +
        "O serviço pode estar fora do ar ou ter rejeitado o pedido.",
    };
  }

  const ext = isPng(buffer) ? "png" : "webp";
  const dir = uploadsCategoryDir("emojis");
  await mkdir(dir, { recursive: true });

  const filename = `generated-${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);

  return {
    ok: true,
    pendingPath: `/uploads/emojis/${filename}`,
    imagePath: `/uploads/emojis/${filename}`,
    name: prompt.slice(0, 24) || "emoji",
  };
}

export async function saveEmoji(
  _prev: EmojiaResult | null,
  formData: FormData
): Promise<EmojiaResult> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim().slice(0, 24);
  const imagePath = String(formData.get("imagePath") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim().slice(0, 200);

  if (!name) return { ok: false, error: "Dê um nome ao emoji." };
  if (!isSafeEmojiImagePath(imagePath)) {
    return { ok: false, error: "Imagem inválida." };
  }

  try {
    await access(uploadUrlToPath(imagePath)!);
  } catch {
    return { ok: false, error: "Imagem inválida." };
  }

  const emoji = await prisma.customEmoji.create({
    data: {
      userId: user.id,
      name,
      prompt,
      imagePath,
      mime: imagePath.endsWith(".webp") ? "image/webp" : "image/png",
    },
  });

  revalidatePath("/emojis");
  return {
    ok: true,
    id: emoji.id,
    imagePath: emoji.imagePath,
    name: emoji.name,
  };
}

export async function deleteEmoji(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const emoji = await prisma.customEmoji.findFirst({
    where: { id, userId: user.id },
  });
  if (!emoji) return;

  await prisma.customEmoji.delete({ where: { id } });

  const stillUsed =
    (await prisma.customEmoji.count({
      where: { imagePath: emoji.imagePath, id: { not: emoji.id } },
    })) +
    (await prisma.profile.count({
      where: { avatarUrl: emoji.imagePath },
    }));

  if (stillUsed === 0 && isSafeEmojiImagePath(emoji.imagePath)) {
    const target = uploadUrlToPath(emoji.imagePath)!;
    await rm(target, { force: true });
  }

  revalidatePath("/emojis");
}

export async function setProfileEmoji(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const emoji = await prisma.customEmoji.findFirst({
    where: { id, userId: user.id },
  });
  if (!emoji) return;

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { avatarUrl: emoji.imagePath },
    create: { userId: user.id, avatarUrl: emoji.imagePath },
  });

  revalidatePath("/emojis");
  revalidatePath("/profile");
}