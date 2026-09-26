"use client";

import { useActionState, useRef } from "react";

import { identifyByVideo } from "@/app/actions/search";
import ScoredResultGrid from "@/components/scored-result-grid";

const inputClass =
  "rounded-lg border border-black/[.08] bg-background px-3 py-2 text-sm outline-none dark:border-white/[.145]";
const labelClass = "text-sm font-medium";

export default function VideoSearch() {
  const [state, formAction, pending] = useActionState(
    identifyByVideo,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} ref={formRef} className="max-w-2xl">
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Cole um link de vídeo (YouTube, TikTok, Twitch, Vimeo, Dailymotion,
          Bilibili ou Kick). Usamos apenas informações públicas (título,
          descrição, perfil, miniatura). Nenhuma cena do vídeo é analisada.
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="videoUrl" className={labelClass}>
            🔗 Link do vídeo
          </label>
          <input
            id="videoUrl"
            name="url"
            type="url"
            required
            placeholder="https://www.youtube.com/watch?v=…"
            className={inputClass}
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="videoText" className={labelClass}>
            Detalhes que você lembra (opcional)
          </label>
          <textarea
            id="videoText"
            name="text"
            rows={3}
            placeholder="Ex.: protagonista de cabelo vermelho, espada gigante…"
            className={inputClass}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Procurando…" : "🔗 Pesquisar por link de vídeo"}
          </button>
          {state && (
            <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={pending}
              className="h-11 rounded-full border border-black/[.08] px-6 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-white/[.06]"
            >
              🔄 Procurar novamente
            </button>
          )}
        </div>
      </form>

      {state?.message && (
        <p className="max-w-2xl rounded-2xl border border-black/[.08] p-4 text-sm text-zinc-600 dark:border-white/[.145] dark:text-zinc-300">
          {state.message}
        </p>
      )}

      {state?.video && (
        <div className="max-w-2xl rounded-2xl border border-black/[.08] p-4 dark:border-white/[.145]">
          {state.video.ok ? (
            <>
              <p className="text-sm font-semibold">
                {state.video.title}
                <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal dark:bg-zinc-800">
                  {state.video.platform}
                </span>
              </p>
              {state.video.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={state.video.thumbnail}
                  alt="Miniatura pública do vídeo"
                  className="mt-3 max-h-56 rounded-xl border border-black/[.08] dark:border-white/[.145]"
                />
              )}
              {state.video.description && (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {state.video.description}
                </p>
              )}
              {state.video.author && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Canal/perfil: {state.video.author}
                </p>
              )}
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {state.video.notes} Análise visual do vídeo:{" "}
                <strong>não realizada</strong>.
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {state.video.error}
            </p>
          )}
        </div>
      )}

      {state?.needMore && !state.message && (
        <p className="max-w-2xl rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          Várias tentativas não chegaram a uma correspondência sólida. Adicione
          mais detalhes (descrição, caracteres, canal/perfil, cena) e tente
          novamente.
        </p>
      )}

      {state && state.results.length > 0 && (
        <ScoredResultGrid cards={state.results} />
      )}
    </div>
  );
}