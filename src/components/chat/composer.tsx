"use client";

import { useRef, useState } from "react";

import { sendChatMessage } from "@/app/actions/chat";
import { AudioRecorder } from "./audio-recorder";
import { EmojiPicker, type CustomEmojiClient } from "./emoji-picker";
import { formatDuration } from "./types";

/* eslint-disable @next/next/no-img-element */

const MAX_BYTES: Record<string, number> = {
  image: 5 * 1024 * 1024,
  audio: 12 * 1024 * 1024,
  video: 24 * 1024 * 1024,
  attachment: 12 * 1024 * 1024,
};

type Draft = {
  file: File;
  kind: "image" | "audio" | "video" | "attachment";
  name: string;
  size: number;
  previewUrl: string;
  duration?: number;
};

function kindLabel(kind: Draft["kind"]): string {
  return { image: "imagem", audio: "áudio", video: "vídeo", attachment: "anexo" }[kind];
}

export function Composer({
  roomId,
  customEmojis,
  onMessageSent,
}: {
  roomId: string;
  customEmojis: CustomEmojiClient[];
  onMessageSent: () => void;
}) {
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [emojisOpen, setEmojisOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  function pickFile(file: File, kind: Draft["kind"]) {
    setDraftError(null);
    setError(null);
    const limit = MAX_BYTES[kind];
    if (file.size > limit) {
      const label = kindLabel(kind);
      setDraftError(
        `O ${label} excede o limite de ${Math.round(limit / 1024 / 1024)} MB.`
      );
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const base: Draft = {
      file,
      kind,
      name: file.name,
      size: file.size,
      previewUrl,
    };

    if (kind === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.src = previewUrl;
      video.onloadedmetadata = () => {
        if (Number.isFinite(video.duration)) {
          setDraft({ ...base, duration: Math.round(video.duration) });
        }
      };
    }

    setDraft(base);
  }

  function clearDraft() {
    if (draft) URL.revokeObjectURL(draft.previewUrl);
    setDraft(null);
  }

  async function runSend(formData: FormData): Promise<void> {
    setError(null);
    const result = (await sendChatMessage(formData).catch(() => null)) as
      | { ok: false; error: string }
      | null
      | undefined;
    if (result === undefined || result === null) {
      return;
    }
    setError(result.error);
  }

  async function handleSend() {
    if (pending) return;
    setPending(true);
    const trimmed = message.trim();
    try {
      if (draft) {
        const formData = new FormData();
        formData.set("roomId", roomId);
        formData.set("type", draft.kind.toUpperCase());
        formData.set("message", trimmed);
        formData.set("media", draft.file);
        formData.set("duration", String(draft.duration ?? 0));
        await runSend(formData);
        if (!draftError) {
          clearDraft();
          setMessage("");
          onMessageSent();
        }
        return;
      }

      const target = linkOpen && linkUrl.trim() ? linkUrl.trim() : trimmed;
      if (!target) return;

      const formData = new FormData();
      formData.set("roomId", roomId);
      formData.set("type", "TEXT");
      formData.set("message", target);
      await runSend(formData);
      setLinkUrl("");
      setLinkOpen(false);
      setMessage("");
      onMessageSent();
    } finally {
      setPending(false);
    }
  }

  function handleEmojiPick(payload: {
    unicode?: string;
    emojiId?: string;
    name?: string;
  }) {
    const formData = new FormData();
    formData.set("roomId", roomId);
    formData.set("type", "EMOJI");
    formData.set("message", payload.unicode ?? payload.name ?? "");
    if (payload.emojiId) formData.set("emojiId", payload.emojiId);
    setEmojisOpen(false);
    void runSend(formData).then(() => onMessageSent());
  }

  function handleAudioReady(file: File, duration: number) {
    setRecording(false);
    const formData = new FormData();
    formData.set("roomId", roomId);
    formData.set("type", "AUDIO");
    formData.set("message", message.trim());
    formData.set("media", file);
    formData.set("duration", String(duration));
    setMessage("");
    void runSend(formData).then(() => onMessageSent());
  }

  const canSend =
    (draft !== null || message.trim() || (linkOpen && linkUrl.trim())) &&
    !pending;

  return (
    <div className="border-t border-black/[.08] p-3 pt-3 dark:border-white/[.145]">
      {recording && (
        <div className="mb-2">
          <AudioRecorder
            onCancel={() => setRecording(false)}
            onReady={handleAudioReady}
          />
        </div>
      )}

      {draft && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-black/[.08] bg-black/[.02] p-3 dark:border-white/[.145] dark:bg-white/[.04]">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {draft.kind === "image" && (
              <img
                src={draft.previewUrl}
                alt="Prévia da imagem"
                className="h-16 w-16 rounded-xl object-cover"
              />
            )}
            {draft.kind === "video" && (
              <video
                src={draft.previewUrl}
                muted
                playsInline
                preload="metadata"
                className="h-16 w-24 rounded-xl bg-black object-cover"
              />
            )}
            {draft.kind === "audio" && (
              <span className="text-3xl">🔊</span>
            )}
            {draft.kind === "attachment" && (
              <span className="text-3xl">📎</span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{draft.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {draft.kind === "video" && draft.duration !== undefined
                  ? `Duração ${formatDuration(draft.duration)} • `
                  : ""}
                {formatBytes(draft.size)} • {kindLabel(draft.kind)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearDraft}
            aria-label="Remover mídia"
            className="shrink-0 rounded-full border border-black/[.08] px-3 py-1 text-sm dark:border-white/[.145]"
          >
            Remover
          </button>
        </div>
      )}

      {draftError && (
        <p className="mb-2 text-sm text-red-600 dark:text-red-400">
          {draftError}
        </p>
      )}
      {error && (
        <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {linkOpen && !draft && (
        <div className="mb-2 flex items-center gap-2">
          <input
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="Cole um link (vídeo ou página)"
            className="w-full rounded-xl border border-black/[.08] px-3 py-2 text-sm outline-none dark:border-white/[.145]"
            aria-label="Adicionar link"
          />
          <button
            type="button"
            onClick={() => {
              setLinkOpen(false);
              setLinkUrl("");
            }}
            className="shrink-0 text-sm text-zinc-500 underline dark:text-zinc-400"
          >
            Cancelar
          </button>
        </div>
      )}

      {emojisOpen && (
        <EmojiPicker
          customEmojis={customEmojis}
          onPick={handleEmojiPick}
          onClose={() => setEmojisOpen(false)}
        />
      )}

      <div className="relative flex items-end gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          aria-label="Enviar imagem"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) pickFile(file, "image");
            event.target.value = "";
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          aria-label="Enviar vídeo"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) pickFile(file, "video");
            event.target.value = "";
          }}
        />
        <input
          ref={attachmentInputRef}
          type="file"
          accept="application/pdf,application/zip,text/plain"
          className="hidden"
          aria-label="Enviar anexo"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) pickFile(file, "attachment");
            event.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          aria-label="Enviar imagem"
          title="Enviar imagem"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[.08] text-lg dark:border-white/[.145]"
        >
          📷
        </button>
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          aria-label="Enviar vídeo"
          title="Enviar vídeo"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[.08] text-lg dark:border-white/[.145]"
        >
          🎬
        </button>
        <button
          type="button"
          onClick={() => attachmentInputRef.current?.click()}
          aria-label="Enviar anexo"
          title="Enviar anexo"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[.08] text-lg dark:border-white/[.145]"
        >
          📎
        </button>
        <button
          type="button"
          onClick={() => {
            setRecording((value) => !value);
            setLinkOpen(false);
            setEmojisOpen(false);
          }}
          aria-label="Gravar áudio"
          title="Gravar áudio pelo microfone"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[.08] text-lg dark:border-white/[.145]"
        >
          🔊
        </button>
        <button
          type="button"
          onClick={() => setEmojisOpen((value) => !value)}
          aria-label="Escolher emoji"
          title="Emoji"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[.08] text-lg dark:border-white/[.145]"
        >
          🎨
        </button>
        <button
          type="button"
          onClick={() => setLinkOpen((value) => !value)}
          aria-label="Adicionar link"
          title="Adicionar link"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[.08] text-lg dark:border-white/[.145]"
        >
          🔗
        </button>

        <textarea
          rows={1}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Escreva uma mensagem… (Enter para enviar)"
          aria-label="Mensagem"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-black/[.08] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-zinc-400 focus:border-foreground/40 dark:border-white/[.145]"
        />

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!canSend}
          aria-label="Enviar mensagem"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm text-white transition-colors hover:bg-accent-dark disabled:opacity-40"
        >
          {pending ? "…" : "➤"}
        </button>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}