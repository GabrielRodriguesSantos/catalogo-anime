import type { Metadata } from "next";

import { EmojiStudio } from "@/components/emoji-studio";
import { requireUser } from "@/lib/dal";
import { getCustomEmojis } from "@/lib/social";

export const metadata: Metadata = {
  title: "Emojis (emojIA)",
};

export default async function EmojisPage() {
  const user = await requireUser();
  const emojis = await getCustomEmojis(user.id);

  return <EmojiStudio userEmojis={emojis} />;
}