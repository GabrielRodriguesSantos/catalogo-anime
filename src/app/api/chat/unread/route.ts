import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId, status: "ACTIVE", deletedAt: null },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const memberships = await prisma.chatMembership.findMany({
    where: { userId: user.id },
    select: { roomId: true, lastReadAt: true },
  });
  const rooms = memberships.map((membership) => membership.roomId);

  const [chatMessages, notifications] = await Promise.all([
    rooms.length > 0
      ? prisma.message.findMany({
          where: { roomId: { in: rooms }, senderId: { not: user.id } },
          select: { roomId: true, createdAt: true },
        })
      : Promise.resolve([]),
    prisma.notification.count({
      where: { userId: user.id, readAt: null, archivedAt: null },
    }),
  ]);

  const perRoom: Record<string, number> = {};
  for (const membership of memberships) {
    const since = membership.lastReadAt ?? new Date(0);
    const count = chatMessages.filter(
      (message) =>
        message.roomId === membership.roomId && message.createdAt > since
    ).length;
    if (count > 0) perRoom[membership.roomId] = count;
  }

  return NextResponse.json({
    chat: { total: Object.values(perRoom).reduce((sum, value) => sum + value, 0), rooms: perRoom },
    notifications,
  });
}