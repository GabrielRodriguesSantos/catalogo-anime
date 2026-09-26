"use client";

import Link from "next/link";

import { AudioPlayer } from "./audio-player";
import { autoLinkify } from "./linkify";
import {
  formatClock,
  type ClientMessage,
} from "./types";

/* eslint-disable @next/next/no-img-element */

function VideoLinkMessage({ message }: { message: ClientMessage }) {
  const meta =
    message.metaParsed && "platform" in message.metaParsed
      ? message.metaParsed
      : null;
  const platform = meta?.platform;
  const pageUrl = meta?.pageUrl ?? message.body ?? "";
  const title = meta?.title ?? message.body ?? "Vídeo";
  const thumbnail = meta?.thumbnail ?? null;
  const embedUrl = meta?.embedUrl ?? null;
  const previewOk = meta?.previewAvailable;

  return (
    <div className="w-[min(100%,360px)] overflow-hidden rounded-2xl border border-black/[.08] bg-black/[.02] dark:border-white/[.145] dark:bg-white/[.04]">
      {embedUrl ? (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            title={title}
            className="h-full w-full"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : thumbnail ? (
        <Link href={pageUrl} target="_blank" rel="noreferrer">
          <img
            src={thumbnail}
            alt=""
            className="aspect-video w-full object-cover"
          />
        </Link>
      ) : null}
      <div className="p-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="rounded-full bg-black/[.06] px-2 py-0.5 dark:bg-white/[.08]">
            {platform ?? "Vídeo"}
          </span>
          {!previewOk && <span>Prévia indisponível</span>}
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-medium">{title}</p>
        <a
          href={pageUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-sky-600 underline dark:text-sky-400"
        >
          Abrir no original ↗
        </a>
      </div>
    </div>
  );
}

function WorkMessage({ message }: { message: ClientMessage }) {
  const work = message.work;
  if (!work) return <p className="text-sm">{message.body ?? "Obra compartilhada."}</p>;
  return (
    <Link
      href={`/obras/${work.id}`}
      className="flex w-[min(100%,320px)] items-center gap-3 overflow-hidden rounded-2xl border border-black/[.08] bg-black/[.02] p-2 dark:border-white/[.145] dark:bg-white/[.04]"
    >
      {work.coverUrl ? (
        <img
          src={work.coverUrl}
          alt=""
          className="h-20 w-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-lg bg-black/[.06] text-2xl dark:bg-white/[.08]">
          📚
        </div>
      )}
      <div className="min-w-0">
        <span className="inline-block rounded-full bg-black/[.06] px-2 py-0.5 text-xs text-zinc-500 dark:bg-white/[.08] dark:text-zinc-400">
          {work.type}
        </span>
        <p className="mt-1 line-clamp-2 text-sm font-medium">{work.title}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {work.year ? `${work.year} • ` : ""}
          {work.status}
        </p>
      </div>
    </Link>
  );
}

export function MessageBubble({ message }: { message: ClientMessage }) {
  const senderName =
    message.sender.displayName || message.sender.username || "Usuário";

  function renderBody() {
    switch (message.type) {
      case "IMAGE":
        return (
          <div className="max-w-[min(100%,320px)]">
            {message.mediaUrl && (
              <a href={message.mediaUrl} target="_blank" rel="noreferrer">
                <img
                  src={message.mediaUrl}
                  alt={message.body ?? "Imagem do chat"}
                  className="max-h-72 w-auto rounded-2xl object-cover"
                />
              </a>
            )}
            {message.body && <p className="mt-1.5 text-sm">{message.body}</p>}
          </div>
        );
      case "AUDIO":
        return (
          <div className="space-y-1.5">
            {message.mediaUrl && (
              <AudioPlayer
                src={message.mediaUrl}
                durationSeconds={message.mediaDuration}
              />
            )}
            {message.body && <p className="text-sm">{message.body}</p>}
          </div>
        );
      case "VIDEO":
        return (
          <div className="max-w-[min(100%,340px)] space-y-1.5">
            {message.mediaUrl && (
              <video
                src={message.mediaUrl}
                controls
                preload="none"
                className="max-h-80 w-full rounded-2xl bg-black"
              >
                Seu navegador não suporta vídeo.
              </video>
            )}
            {message.body && <p className="text-sm">{message.body}</p>}
          </div>
        );
      case "ATTACHMENT":
        return (
          <div className="max-w-[min(100%,280px)]">
            {message.mediaUrl ? (
              <a
                href={message.mediaUrl}
                download={message.mediaName ?? undefined}
                className="flex items-center gap-3 rounded-2xl border border-black/[.08] bg-black/[.02] px-4 py-3 dark:border-white/[.145] dark:bg-white/[.04]"
              >
                <span className="text-2xl">📎</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {message.mediaName ?? "Anexo"}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Baixar anexo
                  </span>
                </span>
              </a>
            ) : (
              <p className="text-sm">Anexo indisponível.</p>
            )}
            {message.body && <p className="mt-1.5 text-sm">{message.body}</p>}
          </div>
        );
      case "LINK":
        return (
          <div className="space-y-1">
            {message.body && <p className="text-sm">{autoLinkify(message.body)}</p>}
          </div>
        );
      case "VIDEO_LINK":
        return <VideoLinkMessage message={message} />;
      case "WORK":
        return <WorkMessage message={message} />;
      case "EMOJI":
        return message.mediaUrl ? (
          <div className="flex flex-col items-center gap-1">
            <img
              src={message.mediaUrl}
              alt={message.body ?? "emoji"}
              className="h-14 w-14 object-contain"
            />
            {message.body && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {message.body}
              </span>
            )}
          </div>
        ) : (
          <span className="text-3xl leading-none">{message.body}</span>
        );
      default:
        return message.body ? (
          <p className="whitespace-pre-wrap text-sm">{autoLinkify(message.body)}</p>
        ) : null;
    }
  }

  return (
    <div
      className={`flex ${
        message.mine ? "justify-end" : "justify-start"
      } group`}
    >
      <div
        data-testid={`msg-${message.type}`}
        className={`relative max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm md:max-w-[70%] ${
          message.mine
            ? "rounded-br-md bg-foreground text-background"
            : "rounded-bl-md border border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-900"
        }`}
      >
        {!message.mine && (
          <p className="mb-1 text-[13px] font-semibold">{senderName}</p>
        )}
        {renderBody()}
        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
            message.mine
              ? "text-background/60"
              : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          <span>{formatClock(message.createdAt)}</span>
          {message.mine && (
            <span aria-label="Status de leitura">
              {message.seenCount > 0
                ? message.seenCount >= 2
                  ? `✓✓ ${message.seenCount}`
                  : "✓✓"
                : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}