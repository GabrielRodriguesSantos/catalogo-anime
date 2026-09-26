import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

export const CHAT_MESSAGE_TYPES = [
  "TEXT",
  "IMAGE",
  "AUDIO",
  "VIDEO",
  "ATTACHMENT",
  "LINK",
  "VIDEO_LINK",
  "WORK",
  "EMOJI",
] as const;

export type ChatMessageType = (typeof CHAT_MESSAGE_TYPES)[number];

export const CHAT_MESSAGE_TYPE_LABELS: Record<ChatMessageType, string> = {
  TEXT: "mensagem",
  IMAGE: "imagem",
  AUDIO: "áudio",
  VIDEO: "vídeo",
  ATTACHMENT: "anexo",
  LINK: "link",
  VIDEO_LINK: "vídeo",
  WORK: "obra",
  EMOJI: "emoji",
};

export type MessageMeta =
  | { custom: true; name?: string }
  | {
      platform?: string;
      pageUrl?: string;
      previewAvailable?: boolean;
      title?: string;
      thumbnail?: string;
      embedUrl?: string | null;
    }
  | null;

export function parseMessageMeta(raw: string | null): MessageMeta {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MessageMeta;
  } catch {
    return null;
  }
}

export const getChatOverview = cache(async (userId: string) => {
  const memberships = await prisma.chatMembership.findMany({
    where: { userId },
    orderBy: { joinedAt: "desc" },
    select: {
      lastReadAt: true,
      room: {
        select: {
          id: true,
          type: true,
          name: true,
          updatedAt: true,
          createdAt: true,
          members: {
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  profile: { select: { avatarUrl: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const rooms = memberships.map((membership) => membership.room.id);

  const recentMessages = await prisma.message.findMany({
    where: { roomId: { in: rooms } },
    orderBy: { createdAt: "desc" },
    take: 400,
    select: {
      id: true,
      roomId: true,
      type: true,
      body: true,
      mediaMime: true,
      mediaName: true,
      mediaDuration: true,
      senderId: true,
      createdAt: true,
      sender: { select: { username: true } },
      work: { select: { title: true } },
    },
  });

  return memberships.map((membership) => {
    const room = membership.room;
    const others = room.members.filter((member) => member.userId !== userId);
    const partner = room.type === "DIRECT" ? others[0]?.user ?? null : null;
    const since = membership.lastReadAt ?? new Date(0);

    const unread = recentMessages.filter(
      (message) =>
        message.roomId === room.id &&
        message.senderId !== userId &&
        message.createdAt > since
    ).length;

    const lastMessage = recentMessages
      .filter((message) => message.roomId === room.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    return {
      id: room.id,
      type: room.type,
      name: room.type === "GROUP" ? (room.name ?? null) : (partner?.username ?? null),
      otherUser: partner
        ? {
            id: partner.id,
            username: partner.username,
            displayName: partner.displayName,
            avatarUrl: partner.profile?.avatarUrl ?? null,
          }
        : null,
      memberCount: room.members.length,
      groupName: room.type === "GROUP" ? (room.name ?? null) : null,
      unreadCount: unread,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            type: lastMessage.type,
            preview: messagePreview(lastMessage),
            sender: lastMessage.sender.username,
            createdAt: lastMessage.createdAt.toISOString(),
          }
        : null,
      updatedAt: (lastMessage?.createdAt ?? room.updatedAt ?? room.createdAt).toISOString(),
    };
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});

function messagePreview(message: {
  type: string;
  body: string | null;
  mediaMime: string | null;
  mediaName: string | null;
  mediaDuration: number | null;
  work: { title: string } | null;
}): string {
  switch (message.type) {
    case "IMAGE":
      return `📷 imagem${message.body ? `: ${message.body}` : ""}`;
    case "AUDIO":
      return `🔊 áudio ● ${formattedSeconds(message.mediaDuration ?? 0)}${
        message.body ? ` — ${message.body}` : ""
      }`;
    case "VIDEO":
      return `🎬 vídeo${message.body ? `: ${message.body}` : ""}`;
    case "ATTACHMENT":
      return `📎 anexo${message.mediaName ? `: ${message.mediaName}` : ""}`;
    case "VIDEO_LINK":
      return `🎬 ${message.body ?? "vídeo"}`;
    case "LINK":
      return `🔗 ${message.body ?? ""}`;
    case "WORK":
      return `✨ obra: ${message.work?.title ?? message.body ?? ""}`;
    case "EMOJI":
      return `😄 ${message.body ?? "emoji"}`;
    default:
      return message.body ?? "";
  }
}

function formattedSeconds(seconds: number): string {
  const value = Math.round(seconds);
  const minutes = Math.floor(value / 60);
  const rest = String(value % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

export const getUnreadChatPerRoom = cache(async (userId: string) => {
  const memberships = await prisma.chatMembership.findMany({
    where: { userId },
    select: { roomId: true, lastReadAt: true },
  });

  const rooms = memberships.map((membership) => membership.roomId);
  if (rooms.length === 0) return { total: 0, rooms: {} as Record<string, number> };

  const messages = await prisma.message.findMany({
    where: { roomId: { in: rooms }, senderId: { not: userId } },
    select: { roomId: true, createdAt: true },
  });

  const perRoom: Record<string, number> = {};
  for (const membership of memberships) {
    const since = membership.lastReadAt ?? new Date(0);
    const count = messages.filter(
      (message) =>
        message.roomId === membership.roomId && message.createdAt > since
    ).length;
    if (count > 0) perRoom[membership.roomId] = count;
  }

  const total = Object.values(perRoom).reduce((sum, value) => sum + value, 0);
  return { total, rooms: perRoom };
});

export const getCustomEmojis = cache(async (userId: string) => {
  const emojis = await prisma.customEmoji.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (emojis.length === 0) return [];

  const paths = emojis.map((emoji) => emoji.imagePath);
  const [usage, profileEmoji] = await Promise.all([
    prisma.message.groupBy({
      by: ["mediaUrl"],
      where: { type: "EMOJI", mediaUrl: { in: paths } },
      _count: { _all: true },
    }),
    prisma.profile.findFirst({
      where: { userId },
      select: { avatarUrl: true },
    }),
  ]);

  const usageMap = new Map(
    usage.map((item) => [item.mediaUrl, item._count._all])
  );

  return emojis.map((emoji) => ({
    id: emoji.id,
    name: emoji.name,
    prompt: emoji.prompt,
    imagePath: emoji.imagePath,
    mime: emoji.mime,
    createdAt: emoji.createdAt.toISOString(),
    usageCount: usageMap.get(emoji.imagePath) ?? 0,
    usedOnProfile: profileEmoji?.avatarUrl === emoji.imagePath,
  }));
});

export const getChatUsers = cache(async (currentUserId: string) => {
  return prisma.user.findMany({
    where: { status: "ACTIVE", deletedAt: null, id: { not: currentUserId } },
    orderBy: { username: "asc" },
    take: 200,
    select: {
      id: true,
      username: true,
      displayName: true,
      profile: { select: { avatarUrl: true } },
    },
  });
});

export const getUserInvites = cache(async (currentUserId: string) => {
  return prisma.user.findMany({
    where: { status: "ACTIVE", deletedAt: null, id: { not: currentUserId } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      username: true,
      displayName: true,
      profile: { select: { avatarUrl: true } },
    },
  });
});