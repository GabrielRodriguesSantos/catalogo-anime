"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatDuration } from "./types";

type RecorderState = "inactive" | "recording" | "stopped";

export function AudioRecorder({
  onCancel,
  onReady,
}: {
  onCancel: () => void;
  onReady: (file: File, durationSeconds: number) => void;
}) {
  const [state, setState] = useState<RecorderState>("inactive");
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        mediaRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setState("stopped");
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setBlob(null);
    setDuration(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const recorded = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setBlob(recorded);
      };
      mediaRef.current = recorder;
      recorder.start();
      elapsedRef.current = 0;
      setState("recording");
      timerRef.current = setInterval(() => {
        if (elapsedRef.current >= 300) {
          stopRecording();
          return;
        }
        elapsedRef.current += 1;
        setDuration(elapsedRef.current);
      }, 1000);
    } catch {
      setError(
        "Não foi possível acessar o microfone. Verifique a permissão do navegador."
      );
    }
  }, [stopRecording]);

  function cancelRecording() {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setBlob(null);
    onCancel();
  }

  function togglePreview() {
    const audio = audioRef.current;
    if (!audio || !blob) return;
    if (audio.paused) {
      setPreviewPlaying(true);
      void audio.play().catch(() => setPreviewPlaying(false));
    } else {
      audio.pause();
    }
  }

  function send() {
    if (!blob) return;
    const file = new File([blob], "audio.webm", { type: blob.type || "audio/webm" });
    if (blob.size === 0) {
      setError("Áudio vazio. Tente novamente.");
      return;
    }
    onReady(file, duration);
  }

  if (state === "inactive") {
    return (
      <div className="rounded-2xl border border-black/[.08] bg-black/[.02] p-4 dark:border-white/[.145] dark:bg-white/[.04]">
        <button
          type="button"
          onClick={startRecording}
          className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white"
        >
          <span className="h-2 w-2 rounded-full bg-white" />
          Gravar áudio (microfone)
        </button>
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="ml-2 text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/[.08] bg-black/[.02] p-4 dark:border-white/[.145] dark:bg-white/[.04]">
      {state === "recording" ? (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
            Gravando
          </span>
          <span className="text-sm tabular-nums">{formatDuration(duration)}</span>
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-full bg-black/[.08] px-4 py-1.5 text-sm font-medium dark:bg-white/[.08]"
          >
            Parar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <audio
            ref={audioRef}
            src={blob ? URL.createObjectURL(blob) : undefined}
            onEnded={() => {
              setPreviewPlaying(false);
              if (audioRef.current) audioRef.current.currentTime = 0;
            }}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePreview}
              aria-label={previewPlaying ? "Pausar prévia" : "Ouvir prévia"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm text-background"
            >
              {previewPlaying ? "⏸" : "▶"}
            </button>
            <span className="text-sm tabular-nums">
              {formatDuration(duration)}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Ouça antes de enviar (toca uma vez)
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={send}
              className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background"
            >
              Enviar áudio
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm font-medium dark:border-white/[.145]"
            >
              Cancelar
            </button>
            {error && (
              <span className="text-sm text-red-600 dark:text-red-400">
                {error}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}