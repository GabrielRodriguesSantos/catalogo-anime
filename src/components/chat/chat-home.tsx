"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";

import {
  createGroupChat,
  shareWorkInChat,
  startDirectChat,
} from "@/app/actions/chat";
import {
  formatClock,
  type ClientConversation,
} from "./types";

/* eslint-disable @next/next/no-img-element */

export type ChatUserPick = {
  id: string;
  username: string;
  displayName: string | null;
  profile: { avatarUrl: string | null } | null;
};

type ShareWork = {
  id: string;
  title: string;
  type: string;
  coverUrl: string | null;
  year: number | null;
  status: string;
};

export function ChatHome({
  initialConversations,
  users,
  shareWorkId,
}: {
  initialConversations: ClientConversation[];
  users: ChatUserPick[];
  shareWorkId: string | null;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [showDirect, setShowDirect] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shareWork, setShareWork] = useState<ShareWork | null | "loading">(
    shareWorkId ? "loading" : null
  );
  const [sharedOk, setSharedOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/chat/rooms", { cache: "no-store" });
        if (response.ok) {
          const body = (await response.json()) as {
            conversations: ClientConversation[];
          };
          setConversations(body.conversations);
        }
      } catch {
        // ignore
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!shareWorkId) return;
    fetch(`/api/chat/share-info?workId=${encodeURIComponent(shareWorkId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { work: ShareWork } | null) => setShareWork(body?.work ?? null))
      .catch(() => setShareWork(null));
  }, [shareWorkId]);

  function toggleGroupUser(id: string) {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]
    );
  }

  function runDirect(userId: string) {
    setError(null);
    startTransition(async () => {
      const result = await startDirectChat(userId);
      if (result && "error" in result) setError(result.error);
    });
  }

  function runGroup() {
    setError(null);
    startTransition(async () => {
      const result = await createGroupChat(groupName, selectedIds);
      if (result && "error" in result) setError(result.error);
    });
  }

  function runShare(roomId: string) {
    setError(null);
    if (!shareWorkId) return;
    setSharedOk(null);
    startTransition(async () => {
      const result = await shareWorkInChat(roomId, shareWorkId);
      if (result && "error" in result) setError(result.error);
      else {
        setSharedOk("Obra compartilhada! Os participantes foram avisados.");
        setShowGroup(false);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Conversas</h1>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setShowDirect(true);
              setShowGroup(false);
            }}
            className="rounded-full border border-black/[.08] px-4 py-2 font-medium dark:border-white/[.145]"
          >
            + Nova conversa
          </button>
          <button
            type="button"
            onClick={() => {
              setShowGroup(true);
              setShowDirect(false);
            }}
            className="rounded-full border border-black/[.08] px-4 py-2 font-medium dark:border-white/[.145]"
          >
            + Novo grupo
          </button>
        </div>
      </div>

      {error && <ErrorBox message={error} />}
      {sharedOk && <SuccessBox message={sharedOk} />}

      {conversations.length === 0 ? (
        <p className="rounded-2xl border border-black/[.08] p-6 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
          Você ainda não tem conversas. Inicie uma conversa direta ou crie um
          grupo para começar!
        </p>
      ) : (
        <ul className="space-y-2">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/chat/${conversation.id}`}
                className="flex items-center gap-4 rounded-2xl border border-black/[.08] p-4 transition hover:bg-black/[.02] dark:border-white/[.145] dark:hover:bg-white/[.04]"
              >
                <Avatar conversation={conversation} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">
                      {conversation.type === "GROUP"
                        ? conversation.groupName ?? "Grupo"
                        : conversation.name}
                    </p>
                    {conversation.type === "GROUP" && (
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                        {conversation.memberCount}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                    {conversation.lastMessage
                      ? `${conversation.lastMessage.sender}: ${conversation.lastMessage.preview}`
                      : "Comece a conversar!"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    {conversation.lastMessage
                      ? formatClock(conversation.lastMessage.createdAt)
                      : ""}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <span
                      className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white"
                      aria-label={`${conversation.unreadCount} não lidas`}
                    >
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showDirect && (
        <Modal title="Nova conversa" onClose={() => setShowDirect(false)}>
          {users.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Nenhum outro usuário disponível.
            </p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-black/[.04] dark:hover:bg-white/[.04]"
                >
                  <span className="min-w-0 truncate text-sm">
                    {user.displayName || user.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => runDirect(user.id)}
                    className="shrink-0 rounded-full border border-black/[.08] px-3 py-1 text-sm font-medium dark:border-white/[.145]"
                  >
                    Conversar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {showGroup && (
        <Modal title="Novo grupo" onClose={() => setShowGroup(false)}>
          <label className="block">
            <span className="text-sm font-medium">Nome do grupo</span>
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Ex.: Estúdio de resenhas"
              className="mt-1 w-full rounded-xl border border-black/[.08] px-3 py-2 text-sm outline-none dark:border-white/[.145]"
            />
          </label>
          <p className="mt-4 text-sm font-medium">Participantes</p>
          <ul className="mt-1 max-h-56 space-y-1 overflow-y-auto">
            {users.map((user) => {
              const checked = selectedIds.includes(user.id);
              return (
                <li key={user.id}>
                  <label className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-black/[.04] dark:hover:bg-white/[.04]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGroupUser(user.id)}
                      className="h-4 w-4"
                      aria-label={`Incluir ${user.displayName || user.username}`}
                    />
                    <span className="text-sm">
                      {user.displayName || user.username}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={runGroup}
            disabled={pending || selectedIds.length === 0 || !groupName.trim()}
            className="mt-4 w-full rounded-full bg-accent py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-40"
          >
            {pending ? "Criando…" : "Criar grupo"}
          </button>
        </Modal>
      )}

      {shareWorkId && (
        <Modal
          title="Compartilhar obra no catálogo"
          onClose={() => {
            window.history.replaceState({}, "", "/chat");
            setShareWork(null);
          }}
        >
          {shareWork === "loading" ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Carregando obra…
            </p>
          ) : shareWork ? (
            <>
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-black/[.08] p-3 dark:border-white/[.145]">
                {shareWork.coverUrl ? (
                  <img
                    src={shareWork.coverUrl}
                    alt=""
                    className="h-16 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-12 items-center justify-center rounded-lg bg-black/[.06] text-2xl dark:bg-white/[.08]">
                    📚
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {shareWork.title}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {shareWork.type} • {shareWork.year ?? "—"} • {shareWork.status}
                  </p>
                </div>
              </div>
              <p className="mb-2 text-sm font-medium">Envar para:</p>
              {conversations.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Crie um grupo ou conversa antes de compartilhar.
                </p>
              ) : (
                <ul className="max-h-64 space-y-1 overflow-y-auto">
                  {conversations.map((conversation) => (
                    <li
                      key={conversation.id}
                      className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-black/[.04] dark:hover:bg-white/[.04]"
                    >
                      <span className="min-w-0 truncate text-sm">
                        {conversation.type === "GROUP"
                          ? conversation.groupName
                          : conversation.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => runShare(conversation.id)}
                        className="shrink-0 rounded-full border border-black/[.08] px-3 py-1 text-sm font-medium dark:border-white/[.145]"
                      >
                        Enviar aqui
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Obra não encontrada.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}

function Avatar({ conversation }: { conversation: ClientConversation }) {
  const avatarUrl =
    conversation.type === "DIRECT" ? conversation.otherUser?.avatarUrl : null;
  const label =
    conversation.type === "GROUP"
      ? "👥"
      : (conversation.otherUser?.displayName ??
        conversation.otherUser?.username ??
        "?").slice(0, 2).toUpperCase();

  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/[.08] bg-black/[.04] text-sm font-medium dark:border-white/[.145] dark:bg-white/[.04]">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="avatar-hover h-full w-full rounded-full object-cover"
        />
      ) : (
        label
      )}
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full px-3 py-1 text-sm hover:bg-black/[.05] dark:hover:bg-white/[.08]"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
      {message}
    </p>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
      {message}
    </p>
  );
}