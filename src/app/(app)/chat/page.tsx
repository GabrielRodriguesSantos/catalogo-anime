import type { Metadata } from "next";

import { ChatHome } from "@/components/chat/chat-home";
import { requireUser } from "@/lib/dal";
import { getChatOverview, getChatUsers } from "@/lib/social";

export const metadata: Metadata = {
  title: "Conversas",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ share?: string }>;
}) {
  const { share } = await searchParams;
  const user = await requireUser();

  const [overview, users] = await Promise.all([
    getChatOverview(user.id),
    getChatUsers(user.id),
  ]);

  return (
    <ChatHome
      initialConversations={overview}
      users={users}
      shareWorkId={share ?? null}
    />
  );
}