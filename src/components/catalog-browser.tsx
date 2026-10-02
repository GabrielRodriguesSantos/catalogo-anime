"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { toggleFavoriteCategory } from "@/app/actions/gate";
import { GENRES } from "@/lib/preferences";
import {
  WORK_AGE_RATING_LABELS,
  WORK_TYPE_LABELS,
  dbGenreNamesFromPillValues,
  type WorkCardItem,
} from "@/lib/catalog-data";

const TYPE_TABS = [
  { value: "ANIME", label: "Anime" },
  { value: "MANGA", label: "Mangá" },
  { value: "MANHWA", label: "Manhwa" },
  { value: "MANHUA", label: "Manhua" },
  { value: "DONGHUA", label: "Donghua" },
  { value: "NOVEL", label: "Novel" },
];

function Poster({ work }: { work: WorkCardItem }) {
  return (
    <Link
      href={`/obras/${work.id}`}
      className="group block w-32 shrink-0 sm:w-44"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
        {work.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={work.coverUrl}
            alt={`Capa de ${work.title}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 text-center">
            <span className="text-xs font-semibold text-zinc-400">
              {WORK_TYPE_LABELS[work.type] ?? work.type}
            </span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          {WORK_TYPE_LABELS[work.type] ?? work.type}
        </span>
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur ${
            work.ageRating === "R18" ? "bg-red-600" : "bg-black/60"
          }`}
        >
          {WORK_AGE_RATING_LABELS[work.ageRating] ?? work.ageRating}
          {work.ageRating === "R18" ? "+" : ""}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-tight group-hover:text-accent">
        {work.title}
      </h3>
      {work.year && (
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {work.year}
        </p>
      )}
    </Link>
  );
}

export default function CatalogBrowser({
  works,
  adultVerified = false,
  favoriteCategories = [],
}: {
  works: WorkCardItem[];
  adultVerified?: boolean;
  favoriteCategories?: string[];
}) {
  const [tab, setTab] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [favoriteGenres, setFavoriteGenres] =
    useState<string[]>(favoriteCategories);
  const [, startTransition] = useTransition();

  const visible = useMemo(
    () => works.filter((work) => adultVerified || work.ageRating !== "R18"),
    [works, adultVerified]
  );

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter(
      (work) =>
        work.title.toLowerCase().includes(q) ||
        work.titles.some((title) => title.toLowerCase().includes(q))
    );
  }, [visible, query]);

  const current = useMemo(() => {
    if (tab === "ALL") return searched;
    if (tab === "R18")
      return searched.filter((work) => work.ageRating === "R18");
    return searched.filter((work) => work.type === tab);
  }, [searched, tab]);

  const rows = useMemo(
    () =>
      GENRES.map((genre) => {
        const names = dbGenreNamesFromPillValues([genre.value]);
        return {
          ...genre,
          items: visible.filter(
            (work) =>
              work.ageRating !== "R18" &&
              work.genres.some((g) => names.includes(g.value))
          ),
        };
      }).filter((row) => row.items.length > 0),
    [visible]
  );

  function toggleStar(value: string) {
    const starred = favoriteGenres.includes(value);
    const next = starred
      ? favoriteGenres.filter((item) => item !== value)
      : [...favoriteGenres, value];
    setFavoriteGenres(next);
    startTransition(async () => {
      await toggleFavoriteCategory(value);
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {current.length > 0
              ? `${current.length} obra${current.length === 1 ? "" : "s"}`
              : "Navegue pelo catálogo de obras."}
          </p>
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por título…"
          className="w-full rounded-lg border border-black/[.08] bg-background px-3 py-2 text-sm outline-none sm:w-64 dark:border-white/[.145]"
          aria-label="Buscar obras"
        />
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setTab("ALL")}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            tab === "ALL"
              ? "bg-accent text-white"
              : "border border-black/[.08] hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
          }`}
        >
          Todos
        </button>
        {TYPE_TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === item.value
                ? "bg-accent text-white"
                : "border border-black/[.08] hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
            }`}
          >
            {item.label}
          </button>
        ))}
        {adultVerified ? (
          <button
            type="button"
            onClick={() => setTab("R18")}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
              tab === "R18"
                ? "bg-red-600 text-white"
                : "border border-red-600/50 text-red-600 hover:bg-red-600/10 dark:text-red-400"
            }`}
          >
            18+
          </button>
        ) : (
          <Link
            href="/profile/edit"
            title="Confirme sua idade no perfil para liberar o conteúdo 18+"
            className="shrink-0 rounded-full border border-red-600/50 px-4 py-1.5 text-sm font-bold text-red-600 dark:text-red-400"
          >
            18+ 🔒
          </Link>
        )}
      </div>

      {current.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-black/[.08] p-6 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
          Nenhuma obra encontrada com esses filtros.
        </p>
      ) : tab === "ALL" ? (
        <>
          {rows.length === 0 && (
            <p className="mt-8 rounded-2xl border border-black/[.08] p-6 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
              Nenhuma obra encontrada.
            </p>
          )}
          {rows.map((row) => (
            <section key={row.value} className="mt-8">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  {row.label}
                </h2>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {row.items.length}
                </span>
                <button
                  type="button"
                  onClick={() => toggleStar(row.value)}
                  aria-label={
                    favoriteGenres.includes(row.value)
                      ? `Remover ${row.label} das favoritas`
                      : `Favoritar ${row.label}`
                  }
                  title={
                    favoriteGenres.includes(row.value)
                      ? "Categoria favorita: recebe notificações"
                      : "Favoritar categoria para receber notificações"
                  }
                  className={`ml-auto rounded-full border border-black/[.08] px-3 py-1 text-sm transition-colors dark:border-white/[.145] ${
                    favoriteGenres.includes(row.value)
                      ? "bg-accent text-white"
                      : "text-zinc-500 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                  }`}
                >
                  {favoriteGenres.includes(row.value) ? "★" : "☆"}
                </button>
              </div>
              <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {row.items.map((work) => (
                  <Poster key={work.id} work={work} />
                ))}
              </div>
            </section>
          ))}
          <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
            Marque com ★ as categorias favoritas — obras novas dessas categorias
            geram notificações aqui no site.
          </p>
        </>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {current.map((work) => (
            <Poster key={work.id} work={work} />
          ))}
        </div>
      )}
    </div>
  );
}