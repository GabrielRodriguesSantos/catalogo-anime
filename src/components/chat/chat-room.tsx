"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { markRoomRead } from "@/app/actions/chat";
import { Composer } from "./composer";
import { MessageList } from "./message-list";
import type { ClientMessage, ClientRoom } from "./types";

/* eslint-disable @next/next/no-img-element */

export type ComposerEmoji = {
  id: string;
  name: string;
  prompt: string;
  imagePath: string;
};

type Loaded = {
  room: ClientRoom;
  messages: ClientMessage[];
};

function roomTitle(room: ClientRoom, meId: string): string {
  if (room.type === "GROUP") return room.name ?? "Grupo";
  const partner = room.members.find((member) => member.id !== meId);
  return partner?.displayName || partner?.username || "Conversa";
}

export function ChatRoom({
  roomId,
  meId,
  initialEmojis,
}: {
  roomId: string;
  meId: string;
  initialEmojis: ComposerEmoji[];
}) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emojis, setEmojis] = useState<ComposerEmoji[]>(initialEmojis);
  const loadedRef = useRef(false);
  const afterRef = useRef<string | null>(null);

  const loadMessages = useCallback(
    async (isInitial: boolean) => {
      try {
        const base = `/api/chat/rooms/${encodeURIComponent(roomId)}/messages`;
        const url = isInitial
          ? `${base}?limit=200`
          : `${base}?after=${encodeURIComponent(afterRef.current ?? "")}`;
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            setError("Conversa não encontrada.");
          }
          return;
        }
        const body = (await response.json()) as Loaded;
        setData((previous) => {
          if (!previous || previous.room.id !== body.room.id) {
            const last = body.messages[body.messages.length - 1];
            if (last) afterRef.current = last.createdAt;
            return body;
          }
          const known = new Set(previous.messages.map((message) => message.id));
          const fresh = body.messages.filter((message) => !known.has(message.id));
          const last = body.messages[body.messages.length - 1];
          if (last) afterRef.current = last.createdAt;
          if (fresh.length === 0) return previous;
          return { room: body.room, messages: [...previous.messages, ...fresh] };
        });
      } catch {
        // Falhas transientes de rede são ignoradas; o polling tenta de novo.
      }
    },
    [roomId]
  );

  const refreshEmojis = useCallback(() => {
    fetch("/api/chat/emojis", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { emojis: ComposerEmoji[] } | null) => {
        if (body) setEmojis(body.emojis);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void loadMessages(true);

    const interval = setInterval(() => {
      void loadMessages(false);
    }, 2500);

    return () => clearInterval(interval);
  }, [loadMessages]);

  const markRead = useCallback(() => {
    void markRoomRead(roomId);
  }, [roomId]);

  useEffect(() => {
    if (data && data.messages.length > 0) {
      const timer = setTimeout(markRead, 400);
      return () => clearTimeout(timer);
    }
  }, [data, markRead]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
          <Link
            href="/chat"
            className="mt-2 inline-block text-sm font-medium underline"
          >
            ← Voltar às conversas
          </Link>
        </div>
      </div>
    );
  }

  const room = data?.room;

  return (
    <div className="flex h-[calc(100vh-4.5rem)] flex-col">
      <header className="flex items-center justify-between border-b border-black/[.08] px-4 py-3 dark:border-white/[.145] md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/chat"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[.08] text-base dark:border-white/[.145] md:hidden"
            aria-label="Voltar às conversas"
          >
            ←
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold">
                {room ? roomTitle(room, meId) : "…"}
              </h1>
              {room?.type === "GROUP" && (
                <span className="shrink-0 rounded-full bg-black/[.06] px-2 py-0.5 text-xs text-zinc-500 dark:bg-white/[.08] dark:text-zinc-400">
                  {room.members.length} membros
                </span>
              )}
            </div>
            {room && room.type === "DIRECT" && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Conversa direta
              </p>
            )}
          </div>
        </div>
        {room && (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {room.members.slice(0, 5).map((member) => (
              <span
                key={member.id}
                title={member.displayName || member.username}
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-black/[.08] bg-black/[.04] text-xs font-medium dark:border-white/[.145] dark:bg-white/[.04]"
              >
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.username}
                    className="avatar-hover h-full w-full rounded-full object-cover"
                  />
                ) : (
                  (member.displayName || member.username).slice(0, 2).toUpperCase()
                )}
              </span>
            ))}
          </div>
        )}
      </header>

      <MessageList messages={data?.messages ?? []} />

      <Composer
        roomId={roomId}
        customEmojis={emojis}
        onMessageSent={() => {
          void loadMessages(false);
          refreshEmojis();
        }}
      />
    </div>
  );
}