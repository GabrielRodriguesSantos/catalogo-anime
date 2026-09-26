"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type UnreadPayload = {
  chat: { total: number; rooms: Record<string, number> };
  notifications: number;
};

export function NotificationsBell() {
  const [payload, setPayload] = useState<UnreadPayload | null>(null);

  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        const response = await fetch("/api/chat/unread", { cache: "no-store" });
        if (response.ok && alive) {
          setPayload((await response.json()) as UnreadPayload);
        }
      } catch {
        // ignore
      }
    }
    void refresh();
    const interval = setInterval(() => void refresh(), 10000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const totalUnread = (payload?.chat.total ?? 0) + (payload?.notifications ?? 0);

  return (
    <Link
      href="/profile/notifications"
      aria-label={`Notificações${
        totalUnread > 0 ? `: ${totalUnread} não lidas` : ""
      }`}
      className="relative rounded-full border border-black/[.08] px-4 py-1.5 dark:border-white/[.145]"
    >
      🔔
      {totalUnread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
          {totalUnread}
        </span>
      )}
    </Link>
  );
}