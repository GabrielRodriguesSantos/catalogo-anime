"use client";

import { useEffect, useRef, useState } from "react";

import { MessageBubble } from "./message-bubble";
import { formatDateSeparator, type ClientMessage } from "./types";

export function MessageList({ messages }: { messages: ClientMessage[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  useEffect(() => {
    if (stickToBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, stickToBottom]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distance < 80);
  }

  const rows: { key: string; label?: string; message?: ClientMessage }[] = [];
  let previousKey = "";
  for (const message of messages) {
    const dateKey = formatDateSeparator(message.createdAt);
    if (dateKey !== previousKey) {
      rows.push({ key: `sep-${message.id}`, label: dateKey });
      previousKey = dateKey;
    }
    rows.push({ key: message.id, message });
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] flex-1 items-center justify-center px-6">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nenhuma mensagem ainda. Comece a conversa! 👋
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-6"
    >
      {rows.map((row) =>
        row.message ? (
          <MessageBubble key={row.key} message={row.message} />
        ) : (
          <div key={row.key} className="py-2 text-center">
            <span className="rounded-full bg-black/[.06] px-3 py-1 text-xs text-zinc-500 dark:bg-white/[.08] dark:text-zinc-400">
              {row.label}
            </span>
          </div>
        )
      )}
      <div ref={bottomRef} />
    </div>
  );
}