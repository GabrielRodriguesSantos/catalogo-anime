"use client";

import { useRef, useState } from "react";

import { formatDuration } from "./types";

export function AudioPlayer({
  src,
  durationSeconds,
}: {
  src: string;
  durationSeconds: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [ended, setEnded] = useState(false);
  const [loadedDuration, setLoadedDuration] = useState(0);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      setEnded(false);
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrent(audio.currentTime);
  }

  function handleEnded() {
    setPlaying(false);
    setEnded(true);
    const audio = audioRef.current;
    if (audio) audio.currentTime = 0;
    setCurrent(0);
  }

  const total = durationSeconds ?? loadedDuration;
  const progress =
    total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div
      role="group"
      aria-label="Reprodutor de áudio"
      className="flex min-w-[220px] max-w-full items-center gap-3 rounded-2xl border border-black/[.08] bg-black/[.02] px-3 py-2 dark:border-white/[.145] dark:bg-white/[.04]"
    >
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (audio && Number.isFinite(audio.duration)) {
            setLoadedDuration(audio.duration);
          }
        }}
      />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pausar áudio" : "Reproduzir áudio"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm text-background"
      >
        {playing ? "⏸" : ended ? "↻" : "▶"}
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {formatDuration(current)}
        </span>
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-black/[.1] dark:bg-white/[.12]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-foreground"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {formatDuration(total)}
        </span>
      </div>
    </div>
  );
}