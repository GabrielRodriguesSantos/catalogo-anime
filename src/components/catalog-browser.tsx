"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { searchWorks, type WorksResult } from "@/app/actions/works";
import { GENRES } from "@/lib/preferences";
import {
  WORK_AGE_RATING_LABELS,
  WORK_AGE_RATINGS,
  WORK_STATUS_LABELS,
  WORK_TYPE_LABELS,
  type WorkCardItem,
} from "@/lib/catalog-data";
import WorkCard from "@/components/work-card";

const PAGE_SIZE = 24;
const STATUS_OPTIONS = Object.keys(WORK_STATUS_LABELS);
const TYPE_OPTIONS = Object.keys(WORK_TYPE_LABELS);

function inputClass(active: boolean) {
  return `rounded-lg border bg-background px-3 py-2 text-sm outline-none ${
    active ? "border-foreground/40" : "border-black/[.08] dark:border-white/[.145]"
  }`;
}

export default function CatalogBrowser({
  adultVerified = false,
}: {
  adultVerified?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [ageRating, setAgeRating] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [items, setItems] = useState<WorkCardItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const skipRef = useRef(0);

  function loadMore() {
    startTransition(async () => {
      setLoading(true);
      const result: WorksResult = await searchWorks({
        q: query,
        type,
        genres,
        status,
        ageRating,
        favoriteOnly,
        skip: skipRef.current,
        take: PAGE_SIZE,
      });
      setItems((current) => [...current, ...result.items]);
      setTotal(result.total);
      setHasMore(result.hasMore);
      skipRef.current += result.items.length;
      setLoading(false);
    });
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      skipRef.current = 0;
      startTransition(async () => {
        setLoading(true);
        const result: WorksResult = await searchWorks({
          q: query,
          type,
          genres,
          status,
          ageRating,
          favoriteOnly,
          skip: 0,
          take: PAGE_SIZE,
        });
        setItems(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        skipRef.current = result.items.length;
        setLoading(false);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query, type, genres, status, ageRating, favoriteOnly]);

  function toggleGenre(value: string) {
    setGenres((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {total > 0
              ? `${items.length} de ${total} obras exibidas`
              : "Navegue pelo catálogo de obras."}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título…"
            className={inputClass(Boolean(query))}
            aria-label="Buscar obras"
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={inputClass(Boolean(type))}
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos os tipos</option>
            {TYPE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {WORK_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={inputClass(Boolean(status))}
            aria-label="Filtrar por status da obra"
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {WORK_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
          <select
            value={ageRating}
            onChange={(event) => setAgeRating(event.target.value)}
            className={inputClass(Boolean(ageRating))}
            aria-label="Filtrar por classificação etária"
          >
            <option value="">Todas as classificações</option>
            {WORK_AGE_RATINGS.filter(
              (value) => adultVerified || value !== "R18"
            ).map((value) => (
              <option key={value} value={value}>
                {WORK_AGE_RATING_LABELS[value]}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={favoriteOnly}
              onChange={(event) => setFavoriteOnly(event.target.checked)}
              className="accent-current"
            />
            Só favoritos
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => {
            const active = genres.includes(genre.value);
            return (
              <button
                key={genre.value}
                type="button"
                onClick={() => toggleGenre(genre.value)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-black/[.08] hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
                }`}
              >
                {genre.label}
              </button>
            );
          })}
        </div>
      </div>

      {pending && (
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Carregando obras…
        </p>
      )}

      {items.length === 0 && !pending ? (
        <p className="rounded-2xl border border-black/[.08] p-6 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
          Nenhuma obra encontrada com esses filtros.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-full border border-black/[.08] px-6 py-2.5 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-white/[.06]"
          >
            {loading ? "Carregando…" : "Carregar mais"}
          </button>
        </div>
      )}
    </div>
  );
}