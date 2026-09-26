"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { searchLibrary, type WorksResult } from "@/app/actions/works";
import {
  LIBRARY_SECTIONS,
  WORK_TYPE_LABELS,
  type WorkCardItem,
} from "@/lib/catalog-data";
import { GENRES } from "@/lib/preferences";
import WorkCard from "@/components/work-card";

const PAGE_SIZE = 24;
const TYPE_OPTIONS = Object.keys(WORK_TYPE_LABELS);

const SECTION_OPTIONS = [
  { value: "ALL", label: "Tudo" },
  ...LIBRARY_SECTIONS.map((section) => ({
    value: section.value,
    label: section.label,
  })),
  { value: "FAVORITES", label: "Favoritos" },
];

function inputClass(active: boolean) {
  return `rounded-lg border bg-background px-3 py-2 text-sm outline-none ${
    active ? "border-foreground/40" : "border-black/[.08] dark:border-white/[.145]"
  }`;
}

export default function LibraryBrowser() {
  const [section, setSection] = useState("ALL");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [genre, setGenre] = useState("");
  const [items, setItems] = useState<WorkCardItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const skipRef = useRef(0);

  function filters() {
    return {
      q: query,
      type,
      genres: genre ? [genre] : [],
      status:
        section === "FAVORITES" || section === "ALL" ? "" : section,
      favoriteOnly: section === "FAVORITES",
    };
  }

  function loadMore() {
    startTransition(async () => {
      setLoading(true);
      const result: WorksResult = await searchLibrary({
        ...filters(),
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
        const result: WorksResult = await searchLibrary({
          q: query,
          type,
          genres: genre ? [genre] : [],
          status: section === "FAVORITES" || section === "ALL" ? "" : section,
          favoriteOnly: section === "FAVORITES",
          skip: 0,
          take: PAGE_SIZE,
        });
        setItems(result.items);
        setTotal(result.total);
        setHasMore(result.hasMore);
        skipRef.current = result.items.length;
        setLoading(false);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [section, query, genre, type]);

  const emptyMessage =
    section === "FAVORITES"
      ? "Nenhuma obra favorita ainda."
      : section === "ALL"
        ? "Sua biblioteca está vazia. Adicione obras no catálogo."
        : "Nenhuma obra nesta seção.";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Minha biblioteca
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {total > 0
            ? `${items.length} de ${total} obras exibidas`
            : "Gerencie as obras que você quer ver, está vendo ou já viu."}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {SECTION_OPTIONS.map((option) => {
          const active = section === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSection(option.value)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-black/[.08] hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar na biblioteca…"
          className={inputClass(Boolean(query))}
          aria-label="Buscar na biblioteca"
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
          value={genre}
          onChange={(event) => setGenre(event.target.value)}
          className={inputClass(Boolean(genre))}
          aria-label="Filtrar por gênero"
        >
          <option value="">Todos os gêneros</option>
          {GENRES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {pending && (
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Carregando…
        </p>
      )}

      {items.length === 0 && !pending ? (
        <p className="rounded-2xl border border-black/[.08] p-6 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
          {emptyMessage}
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