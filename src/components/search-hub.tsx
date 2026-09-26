"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import {
  textSearch,
  type ScoredCard,
} from "@/app/actions/search";
import {
  WORK_LANGUAGE_OPTIONS,
  WORK_PLATFORM_OPTIONS,
  WORK_STATUS_LABELS,
  WORK_TYPE_LABELS,
} from "@/lib/catalog-data";
import { GENRES } from "@/lib/preferences";
import ScoredResultGrid from "@/components/scored-result-grid";
import ImageSearch from "@/components/image-search";
import VideoSearch from "@/components/video-search";
import AjudaIA from "@/components/ajuda-ia";

const PAGE_SIZE = 20;
const TABS = [
  { id: "text", label: "🔎 Pesquisar" },
  { id: "image", label: "🖼️ Imagem" },
  { id: "video", label: "🔗 Vídeo" },
  { id: "ajuda", label: "🤖 AjudaIA" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function inputClass(active: boolean) {
  return `rounded-lg border bg-background px-3 py-2 text-sm outline-none ${
    active ? "border-foreground/40" : "border-black/[.08] dark:border-white/[.145]"
  }`;
}

export default function SearchHub({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const [tab, setTab] = useState<TabId>("text");
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [language, setLanguage] = useState("");
  const [platform, setPlatform] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [results, setResults] = useState<ScoredCard[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const skipRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      skipRef.current = 0;
      startTransition(async () => {
        setLoading(true);
        const result = await textSearch({
          q: query,
          type: type || undefined,
          status: status || undefined,
          language: language || undefined,
          platform: platform || undefined,
          genres: genres.length ? genres : undefined,
          skip: 0,
          take: PAGE_SIZE,
        });
        setResults(result.results);
        setTotal(result.total);
        setHasMore(result.hasMore);
        skipRef.current = result.results.length;
        setLoading(false);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query, type, status, language, platform, genres]);

  function loadMore() {
    startTransition(async () => {
      setLoading(true);
      const result = await textSearch({
        q: query,
        type: type || undefined,
        status: status || undefined,
        language: language || undefined,
        platform: platform || undefined,
        genres: genres.length ? genres : undefined,
        skip: skipRef.current,
        take: PAGE_SIZE,
      });
      setResults((current) => [...current, ...result.results]);
      setTotal(result.total);
      setHasMore(result.hasMore);
      skipRef.current += result.results.length;
      setLoading(false);
    });
  }

  function toggleGenre(value: string) {
    setGenres((current) =>
      current.includes(value)
        ? current.filter((genre) => genre !== value)
        : [...current, value]
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Pesquisa</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Encontra por nome exato, aproximado, erros de digitação, títulos
        alternativos, outros idiomas, descrições e o que você souber descrever —
        ou por imagem e link de vídeo.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-black/[.08] hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "image" && (
        <div className="mt-6">
          <ImageSearch />
        </div>
      )}
      {tab === "video" && (
        <div className="mt-6">
          <VideoSearch />
        </div>
      )}
      {tab === "ajuda" && (
        <div className="mt-6">
          <AjudaIA />
        </div>
      )}

      {tab === "text" && (
        <div className="mt-6">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome, aproximação, alternativa, descrição…"
              className={inputClass(Boolean(query))}
              aria-label="Buscar obras"
              autoFocus
            />
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className={inputClass(Boolean(type))}
              aria-label="Filtrar por tipo"
            >
              <option value="">Todos os tipos</option>
              {Object.keys(WORK_TYPE_LABELS).map((value) => (
                <option key={value} value={value}>
                  {WORK_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={inputClass(Boolean(status))}
              aria-label="Filtrar por status"
            >
              <option value="">Todos os status</option>
              {Object.keys(WORK_STATUS_LABELS).map((value) => (
                <option key={value} value={value}>
                  {WORK_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className={inputClass(Boolean(language))}
              aria-label="Filtrar por idioma"
            >
              <option value="">Todos os idiomas</option>
              {WORK_LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className={inputClass(Boolean(platform))}
              aria-label="Filtrar por plataforma"
            >
              <option value="">Todas as plataformas</option>
              {WORK_PLATFORM_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <button
                key={genre.value}
                type="button"
                onClick={() => toggleGenre(genre.value)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  genres.includes(genre.value)
                    ? "border-foreground bg-foreground text-background"
                    : "border-black/[.08] hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
                }`}
              >
                {genre.label}
              </button>
            ))}
          </div>

          {pending && (
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Pesquisando…
            </p>
          )}

          {results.length === 0 && !pending ? (
            <p className="rounded-2xl border border-black/[.08] p-6 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
              {query || genres.length || type || status || language || platform
                ? "Nenhuma obra corresponde aos critérios informados."
                : "Digite o que procura ou aplique os filtros — o catálogo inteiro aparece sem filtros."}
            </p>
          ) : (
            <>
              <ScoredResultGrid cards={results} />
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                {results.length} de {total} obras{" "}
                {genres.length > 0 || type || status || language || platform
                  ? "(filtros aplicados)"
                  : ""}
              </p>
            </>
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

          {query && results.length > 0 && (
            <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
              Para entender as sugestões, campos como{" "}
              {results[0].matchedFields.slice(0, 3).join(", ")} ajudaram na
              correspondência.
            </p>
          )}
        </div>
      )}
    </div>
  );
}