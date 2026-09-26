"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isAdultRating, isAdultViewer } from "@/lib/content-gates";
import {
  CHAT_MESSAGE_TYPE_LABELS,
  type ChatMessageType,
} from "@/lib/social";
import { validateChatMedia, saveChatMedia } from "@/lib/media-files";
import {
  classifyVideoUrl,
  deriveVideoEmbedUrl,
  fetchVideoMeta,
  type VideoMeta,
} from "@/lib/webinfo";

export type SendChatFailure = { ok: false; error: string };

function isSingleUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

function buildMeta(pageUrl: string, platform: string, video: VideoMeta | null): string {
  const meta: Record<string, string | null | boolean> = {
    platform,
    pageUrl,
    previewAvailable: Boolean(video && video.ok),
    embedUrl: deriveVideoEmbedUrl(pageUrl, platform),
  };
  if (video && video.ok) {
    meta.title = video.title;
    meta.thumbnail = video.thumbnail;
  }
  return JSON.stringify(meta);
}

export async function sendChatMessage(
  formData: FormData
): Promise<SendChatFailure | undefined> {
  const user = await requireUser();

  const roomId = String(formData.get("roomId") ?? "").trim();
  let type = String(formData.get("type") ?? "TEXT").trim() as ChatMessageType;
  let body = String(formData.get("message") ?? "").trim();
  const workId = String(formData.get("workId") ?? "").trim();
  const emojiId = String(formData.get("emojiId") ?? "").trim();
  const durationRaw = String(formData.get("duration") ?? "").trim();
  const duration = Number.isFinite(Number(durationRaw))
    ? Math.max(0, Math.round(Number(durationRaw)))
    : undefined;

  if (!roomId) return { ok: false, error: "Conversa inválida." };

  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { members: { select: { userId: true } } },
  });
  if (!room) return { ok: false, error: "Conversa não encontrada." };
  if (!room.members.some((member) => member.userId === user.id)) {
    return { ok: false, error: "Você não participa desta conversa." };
  }

  const file = formData.get("media");
  let mediaUrl: string | null = null;
  let mediaMime: string | null = null;
  let mediaName: string | null = null;
  if (file instanceof File && file.size > 0) {
    const check = await validateChatMedia(file);
    if (!check.ok) return { ok: false, error: check.error };
    mediaUrl = await saveChatMedia(file, check.kind, check.ext);
    mediaMime = check.mime;
    mediaName = file.name;
    if (type === "TEXT") {
      type = (check.kind === "image" ? "IMAGE" : check.kind.toUpperCase()) as (
        | "IMAGE"
        | "AUDIO"
        | "VIDEO"
        | "ATTACHMENT"
      );
    }
  }

  let meta: string | null = null;
  let workTitle: string | null = null;

  if (type === "TEXT" && body && isSingleUrl(body)) {
    const classified = classifyVideoUrl(body);
    type = "error" in classified ? "LINK" : "VIDEO_LINK";
  }

  if (type === "VIDEO_LINK") {
    const classified = classifyVideoUrl(body);
    if ("error" in classified) {
      type = "LINK";
    } else {
      const video = await fetchVideoMeta(body).catch(() => null);
      meta = buildMeta(classified.pageUrl, classified.platform, video);
    }
  }

  if (type === "WORK") {
    const work = await prisma.work.findUnique({
      where: { id: workId },
      select: { title: true, ageRating: true },
    });
    if (!work) return { ok: false, error: "Obra não encontrada." };

    if (isAdultRating(work.ageRating)) {
      if (!(await isAdultViewer(user.id))) {
        return {
          ok: false,
          error:
            "Para enviar esta obra você precisa confirmar que é maior de 18 anos nas configurações do perfil.",
        };
      }
      const memberProfiles = await prisma.profile.findMany({
        where: { userId: { in: room.members.map((member) => member.userId) } },
        select: { userId: true, adultVerified: true },
      });
      const adultMap = new Map(
        memberProfiles.map((profile) => [
          profile.userId,
          profile.adultVerified === true,
        ])
      );
      const blocked = room.members.some(
        (member) => !adultMap.get(member.userId)
      );
      if (blocked) {
        return {
          ok: false,
          error:
            "Nem todos os participantes desta conversa podem ver conteúdo 18+.",
        };
      }
    }

    workTitle = work.title;
    body = work.title;
  }

  if (type === "EMOJI") {
    if (emojiId) {
      const emoji = await prisma.customEmoji.findFirst({
        where: { id: emojiId, userId: user.id },
      });
      if (!emoji) return { ok: false, error: "Emoji não encontrado." };
      mediaUrl = emoji.imagePath;
      mediaMime = emoji.mime;
      body = emoji.name;
      meta = JSON.stringify({ custom: true });
    }
    if (!body) return { ok: false, error: "Escolha um emoji." };
  }

  const now = new Date();

  const otherMembers = room.members.filter((member) => member.userId !== user.id);

  await prisma.$transaction([
    prisma.message.create({
      data: {
        roomId: room.id,
        senderId: user.id,
        type,
        body,
        mediaUrl,
        mediaMime,
        mediaName,
        mediaDuration: mediaUrl ? duration : undefined,
        meta,
        workId: workId || undefined,
      },
    }),
    ...otherMembers.map((member) =>
      prisma.notification.create({
        data: {
          userId: member.userId,
          type: type === "WORK" ? "WORK_SHARED" : "MESSAGE",
          title:
            room.type === "GROUP"
              ? `${room.name ?? "Grupo"}: ${user.username} enviou`
              : `${user.username} enviou uma ${CHAT_MESSAGE_TYPE_LABELS[type]}`,
          message:
            type === "WORK"
              ? `recomendou "${workTitle ?? ""}" para você.`
              : previewFor(type, body),
          link: `/chat/${room.id}`,
          priority: type === "WORK" ? 1 : 0,
        },
      })
    ),
    prisma.chatMembership.update({
      where: { roomId_userId: { roomId: room.id, userId: user.id } },
      data: { lastReadAt: now },
    }),
  ]);

  revalidatePath("/chat");
  revalidatePath(`/chat/${room.id}`);
  revalidatePath("/profile/notifications");
  return undefined;
}

function previewFor(type: ChatMessageType, body: string): string {
  if (type === "WORK") return "Uma obra foi compartilhada.";
  if (type === "IMAGE") return "Nova imagem.";
  if (type === "AUDIO") return "Novo áudio.";
  if (type === "VIDEO") return "Novo vídeo.";
  if (type === "ATTACHMENT") return "Novo anexo.";
  if (type === "EMOJI") return "Enviou um emoji.";
  if (type === "LINK" || type === "VIDEO_LINK") return body;
  return body.slice(0, 140);
}

export async function startDirectChat(
  otherUserId: string
): Promise<SendChatFailure | undefined> {
  const user = await requireUser();

  const other = await prisma.user.findUnique({
    where: { id: otherUserId, status: "ACTIVE", deletedAt: null },
    select: { id: true },
  });
  if (!other) return { ok: false, error: "Usuário não encontrado." };
  if (other.id === user.id) return { ok: false, error: "Escolha outro usuário." };

  const existing = await prisma.chatRoom.findFirst({
    where: {
      type: "DIRECT",
      members: { every: { userId: { in: [user.id, other.id] } } },
    },
  });
  if (existing) {
    revalidatePath("/chat");
    redirect(`/chat/${existing.id}`);
  }

  const room = await prisma.chatRoom.create({
    data: {
      type: "DIRECT",
      members: {
        create: [
          { userId: user.id, lastReadAt: new Date() },
          { userId: other.id },
        ],
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: other.id,
      type: "MESSAGE",
      title: `${user.username} iniciou uma conversa com você.`,
      message: "Comece a conversar 😀",
      link: `/chat/${room.id}`,
      priority: 0,
    },
  });

  revalidatePath("/chat");
  redirect(`/chat/${room.id}`);
}

export async function createGroupChat(
  name: string,
  memberIds: string[]
): Promise<SendChatFailure | undefined> {
  const user = await requireUser();

  const cleanName = String(name ?? "").trim().slice(0, 60);
  if (!cleanName) return { ok: false, error: "Dê um nome ao grupo." };
  const ids = [...new Set(memberIds)].filter((id) => id !== user.id).slice(0, 9);
  if (ids.length < 1) return { ok: false, error: "Adicione ao menos 1 participante." };

  const users = await prisma.user.findMany({
    where: { id: { in: ids }, status: "ACTIVE", deletedAt: null },
    select: { id: true, username: true },
  });
  if (users.length !== ids.length)
    return { ok: false, error: "Participante inválido." };

  const room = await prisma.chatRoom.create({
    data: {
      type: "GROUP",
      name: cleanName,
      members: {
        create: [
          { userId: user.id, lastReadAt: new Date() },
          ...ids.map((id) => ({ userId: id })),
        ],
      },
    },
  });

  await prisma.$transaction([
    ...users.map((member) =>
      prisma.notification.create({
        data: {
          userId: member.id,
          type: "GROUP",
          title: `${user.username} te adicionou ao grupo "${cleanName}".`,
          message: "Você pode conversar com todos no novo grupo.",
          link: `/chat/${room.id}`,
          priority: 0,
        },
      })
    ),
  ]);

  revalidatePath("/chat");
  redirect(`/chat/${room.id}`);
}

export async function markRoomRead(roomId: string): Promise<void> {
  const user = await requireUser();

  const membership = await prisma.chatMembership.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });
  if (!membership) return;

  const since = membership.lastReadAt ?? new Date(0);
  const messages = await prisma.message.findMany({
    where: {
      roomId,
      senderId: { not: user.id },
      createdAt: { gte: since },
    },
    select: { id: true },
  });

  if (messages.length > 0) {
    const messageIds = messages.map((message) => message.id);
    const existingReads = await prisma.messageRead.findMany({
      where: { userId: user.id, messageId: { in: messageIds } },
      select: { messageId: true },
    });
    const existing = new Set(existingReads.map((read) => read.messageId));
    const toCreate = messageIds.filter((id) => !existing.has(id));
    if (toCreate.length > 0) {
      await prisma.messageRead.createMany({
        data: toCreate.map((messageId) => ({
          messageId,
          userId: user.id,
        })),
      });
    }
  }

  await prisma.chatMembership.update({
    where: { roomId_userId: { roomId, userId: user.id } },
    data: { lastReadAt: new Date() },
  });

  revalidatePath("/chat");
  revalidatePath(`/chat/${roomId}`);
}

export async function shareWorkInChat(
  roomId: string,
  workId: string
): Promise<SendChatFailure | undefined> {
  if (!roomId || !workId) return { ok: false, error: "Dados incompletos." };

  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: { title: true, type: true, coverUrl: true, year: true, status: true },
  });
  if (!work) return { ok: false, error: "Obra não encontrada." };

  const formData = new FormData();
  formData.set("roomId", roomId);
  formData.set("type", "WORK");
  formData.set("workId", workId);
  return sendChatMessage(formData);
}