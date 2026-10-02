"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { askAjuda } from "@/app/actions/search";
import ScoredResultGrid from "@/components/scored-result-grid";

const inputClass =
  "rounded-lg border border-black/[.08] bg-background px-3 py-2 text-sm outline-none dark:border-white/[.145]";
const labelClass = "text-sm font-medium";

export default function AjudaIA() {
  const [state, formAction, pending] = useActionState(askAjuda, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [misses, setMisses] = useState(0);

  useEffect(() => {
    if (state?.needMore) {
      setMisses((count) => count + 1);
    } else if (state && !state.needMore) {
      setMisses(0);
    }
  }, [state]);

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} ref={formRef} className="max-w-2xl">
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Descreva com suas palavras o que está procurando. Você pode combinar
          texto com uma imagem e/ou um link de vídeo. As informações são
          comparadas com o catálogo local e, se estiver habilitada, com a
          internet. Nada é inventado: apenas fontes reais aparecem.
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="ajudaDescription" className={labelClass}>
            Descrição
          </label>
          <textarea
            id="ajudaDescription"
            name="description"
            required
            rows={4}
            placeholder='Ex.: "Quero encontrar um anime de esporte em que o protagonista faz um lance final…"'
            className={inputClass}
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="ajudaVideo" className={labelClass}>
            Link de vídeo (opcional)
          </label>
          <input
            id="ajudaVideo"
            name="videoUrl"
            type="url"
            placeholder="https://www.tiktok.com/@…"
            className={inputClass}
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="ajudaImage" className={labelClass}>
            Imagem (opcional)
          </label>
          <input
            id="ajudaImage"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className={inputClass}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            {pending ? "Consultando…" : "🤖 Perguntar à AjudaIA"}
          </button>
          {state && (
            <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={pending}
              className="h-11 rounded-full border border-black/[.08] px-6 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-white/[.06]"
            >
              🔄
            </button>
          )}
        </div>
      </form>

      {state?.error && (
        <p className="max-w-2xl rounded-2xl border border-red-200 p-4 text-sm text-red-600 dark:border-red-900 dark:text-red-400">
          {state.error}
        </p>
      )}

      {state?.answer && (
        <div className="max-w-2xl rounded-2xl border border-black/[.08] p-4 dark:border-white/[.145]">
          <p className="text-sm text-zinc-700 dark:text-zinc-200">
            {state.answer}
          </p>
          {state.externalAvailable === false && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Integração com pesquisa na internet não está configurada neste
              servidor — a resposta foi baseada apenas no catálogo local.
            </p>
          )}
        </div>
      )}

      {state && state.sources.length > 0 && (
        <div className="max-w-2xl">
          <h3 className="text-sm font-semibold">Fontes</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {state.sources.map((source) => (
              <li key={`${source.label}-${source.url}`}>
                <a
                  href={source.url}
                  target={source.url.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="underline decoration-zinc-300 underline-offset-2 hover:text-foreground dark:decoration-zinc-700"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state?.needMore && (
        <div className="max-w-2xl rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          <p>
            Ainda não encontrei uma correspondência sólida. Conte mais detalhes:
            personagens, cenário, ano aproximado, canal/perfil do vídeo, idioma da
            obra etc.
          </p>
          {misses >= 5 && (
            <p className="mt-2 border-t border-zinc-200 pt-2 font-medium text-accent dark:border-zinc-700">
              Já foram 5 tentativas sem resultado. Tente descrever a obra de
              outra forma: cite o nome de um personagem inesquecível, uma cena
              exata (ex.: "o protagonista ganha um soco no quinto episódio"),
              o estilo do desenho ou a época em que você assistiu.
            </p>
          )}
        </div>
      )}

      {state && state.results.length > 0 && (
        <ScoredResultGrid cards={state.results} />
      )}
    </div>
  );
}