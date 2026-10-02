"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setLibraryStatus, toggleFavorite } from "@/app/actions/works";
import {
  ALL_LIBRARY_STATUSES,
  LIBRARY_STATUS_LABELS,
} from "@/lib/catalog-data";

export default function WorkActions({
  workId,
  isFavorite,
  libraryStatus,
  showLibraryControl = true,
  compact = false,
}: {
  workId: string;
  isFavorite: boolean;
  libraryStatus: string | null;
  showLibraryControl?: boolean;
  compact?: boolean;
}) {
  const [favorite, setFavorite] = useState(isFavorite);
  const [status, setStatus] = useState<string | null>(libraryStatus);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleFavorite(next: boolean) {
    setFavorite((current) => !current);
    await toggleFavorite({ workId, favorite: next });
  }

  function handleStatusChange(next: string) {
    startTransition(async () => {
      await setLibraryStatus({ workId, status: next });
      setStatus(next === "NONE" ? null : next);
    });
  }

  function handleShare() {
    router.push(`/chat?share=${workId}`);
  }

  const buttonClass = compact
    ? "rounded-full border border-black/[.08] px-3 py-1 text-xs transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
    : "rounded-full border border-black/[.08] px-3 py-1.5 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => handleFavorite(!favorite)}
        aria-pressed={favorite}
        className={buttonClass}
      >
        {favorite ? "★ Favorito" : "☆ Favoritar"}
      </button>

      {showLibraryControl && (
        <select
          value={status ?? "NONE"}
          onChange={(event) => handleStatusChange(event.target.value)}
          disabled={pending}
          className={`${compact ? "px-3 py-1 text-xs" : "px-3 py-1.5 text-sm"} rounded-full border border-black/[.08] dark:border-white/[.145] dark:bg-background`}
        >
          <option value="NONE">
            {status ? "Remover da biblioteca" : "Adicionar à biblioteca"}
          </option>
          {ALL_LIBRARY_STATUSES.map((item) => (
            <option key={item} value={item}>
              {LIBRARY_STATUS_LABELS[item]}
            </option>
          ))}
        </select>
      )}

      <button type="button" onClick={handleShare} className={buttonClass}>
        Enviar no chat
      </button>
    </div>
  );
}