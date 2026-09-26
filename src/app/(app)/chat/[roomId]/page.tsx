import type { Metadata } from "next";

import { ChatRoom } from "@/components/chat/chat-room";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Conversa",
};

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const user = await requireUser();

  const emojis = await prisma.customEmoji.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prompt: true, imagePath: true },
  });

  return <ChatRoom roomId={roomId} meId={user.id} initialEmojis={emojis} />;
}