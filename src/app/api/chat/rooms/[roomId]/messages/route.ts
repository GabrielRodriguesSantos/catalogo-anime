import { NextResponse, type NextRequest } from "next/server";

import { isAdultRating, isAdultViewer } from "@/lib/content-gates";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { roomId } = await context.params;
  const afterRaw = _request.nextUrl.searchParams.get("after");
  const limitRaw = Number(_request.nextUrl.searchParams.get("limit") ?? 200);

  const membership = await prisma.chatMembership.findUnique({
    where: { roomId_userId: { roomId, userId: session.userId } },
    include: {
      room: {
        select: {
          id: true,
          type: true,
          name: true,
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

  if (!membership) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const after = afterRaw ? new Date(afterRaw) : null;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 300) : 200;

  const messages = await prisma.message.findMany({
    where: { roomId, ...(after ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          displayName: true,
          profile: { select: { avatarUrl: true } },
        },
      },
      work: {
        select: {
          id: true,
          title: true,
          type: true,
          coverUrl: true,
          year: true,
          status: true,
          ageRating: true,
        },
      },
      readBy: { select: { userId: true } },
    },
  });

  const adult = await isAdultViewer(session.userId);

  const normalized = messages
    .filter(
      (message) =>
        !(
          message.type === "WORK" &&
          isAdultRating(message.work?.ageRating) &&
          !adult
        )
    )
    .map((message) => {
      const seenByOther =
        message.senderId === session.userId
          ? message.readBy
              .map((read) => read.userId)
              .filter((userId) => userId !== message.senderId)
          : [];
      return {
        id: message.id,
        type: message.type,
        body: message.body,
        mediaUrl: message.mediaUrl,
        mediaMime: message.mediaMime,
        mediaName: message.mediaName,
        mediaDuration: message.mediaDuration,
        meta: message.meta,
        workId: message.workId,
        createdAt: message.createdAt,
        sender: message.sender,
        work: message.work,
        seenCount: seenByOther.length,
        mine: message.senderId === session.userId,
        metaParsed: message.meta ? safeJson(message.meta) : null,
      };
    });

  normalized.reverse();

  return NextResponse.json({
    room: {
      id: membership.room.id,
      type: membership.room.type,
      name: membership.room.name,
      members: membership.room.members.map((member) => ({
        id: member.user.id,
        username: member.user.username,
        displayName: member.user.displayName,
        avatarUrl: member.user.profile?.avatarUrl ?? null,
      })),
    },
    messages: normalized,
  });
}

function safeJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}