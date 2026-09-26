"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setLibraryStatus, toggleFavorite } from "@/app/actions/works";
import {
  ALL_LIBRARY_STATUSES,
  LIBRARY_STATUS_LABELS,
  WORK_AGE_RATING_LABELS,
  WORK_STATUS_LABELS,
  WORK_TYPE_LABELS,
  type WorkCardItem,
} from "@/lib/catalog-data";

export default function WorkCard({
  work,
  showLibraryControl = true,
}: {
  work: WorkCardItem;
  showLibraryControl?: boolean;
}) {
  const [isFavorite, setIsFavorite] = useState(work.isFavorite);
  const [libraryStatus, setLocalLibraryStatus] = useState<string | null>(
    work.libraryStatus
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleFavorite(next: boolean) {
    setIsFavorite((current) => !current);
    await toggleFavorite({ workId: work.id, favorite: next });
  }

  function handleStatusChange(status: string) {
    startTransition(async () => {
      await setLibraryStatus({ workId: work.id, status });
      setLocalLibraryStatus(status === "NONE" ? null : status);
    });
  }

  function handleShare() {
    router.push(`/chat?share=${work.id}`);
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-black/[.08] dark:border-white/[.145]">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
        {work.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={work.coverUrl}
            alt={`Capa de ${work.title}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center">
            <span className="text-sm font-semibold text-zinc-400">
              {WORK_TYPE_LABELS[work.type] ?? work.type}
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold backdrop-blur">
          {WORK_TYPE_LABELS[work.type] ?? work.type}
        </span>
        <span
          className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
            work.ageRating === "R18"
              ? "bg-red-600 text-white"
              : "bg-background/90"
          }`}
          title={WORK_AGE_RATING_LABELS[work.ageRating] ?? work.ageRating}
        >
          {WORK_AGE_RATING_LABELS[work.ageRating] ?? work.ageRating}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h2 className="text-base font-semibold leading-snug">{work.title}</h2>
          {work.titles.length > 0 && (
            <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
              {work.titles.join(" · ")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {work.genres.map((genre) => (
            <span
              key={genre.value}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
            >
              {genre.label}
            </span>
          ))}
        </div>

        {work.synopsis && (
          <p className="line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
            {work.synopsis}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{WORK_STATUS_LABELS[work.status] ?? work.status}</span>
          {work.year && <span>{work.year}</span>}
          {work.availability && <span>{work.availability}</span>}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleFavorite(!isFavorite)}
            aria-pressed={isFavorite}
            className="rounded-full border border-black/[.08] px-3 py-1.5 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
          >
            {isFavorite ? "★ Favorito" : "☆ Favoritar"}
          </button>

          {showLibraryControl && (
            <select
              value={libraryStatus ?? "NONE"}
              onChange={(event) => handleStatusChange(event.target.value)}
              disabled={pending}
              className="rounded-full border border-black/[.08] px-3 py-1.5 text-sm dark:border-white/[.145] dark:bg-background"
            >
              <option value="NONE">
                {libraryStatus ? "Remover da biblioteca" : "Adicionar à biblioteca"}
              </option>
              {ALL_LIBRARY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {LIBRARY_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="rounded-full border border-black/[.08] px-3 py-1.5 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
          >
            Enviar no chat
          </button>

          <Link
            href={`/obras/${work.id}`}
            className="rounded-full border border-black/[.08] px-3 py-1.5 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
          >
            Detalhes
          </Link>
        </div>
      </div>
    </article>
  );
}