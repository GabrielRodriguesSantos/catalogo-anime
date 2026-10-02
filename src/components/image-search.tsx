"use client";

import { useActionState, useRef, useState } from "react";

import { identifyByImage } from "@/app/actions/search";
import ScoredResultGrid from "@/components/scored-result-grid";

const inputClass =
  "rounded-lg border border-black/[.08] bg-background px-3 py-2 text-sm outline-none dark:border-white/[.145]";
const labelClass = "text-sm font-medium";

export default function ImageSearch() {
  const [state, formAction, pending] = useActionState(identifyByImage, undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} ref={formRef} className="max-w-2xl">
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Envie uma imagem (ou informe uma URL) para tentar identificar uma obra.
          Combine com uma descrição para buscar no catálogo.
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="image" className={labelClass}>
            Imagem enviada por você
          </label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className={inputClass}
          />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Pré-visualização da imagem enviada"
              className="mt-2 max-h-64 rounded-2xl border border-black/[.08] object-contain dark:border-white/[.145]"
            />
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="imageUrl" className={labelClass}>
            URL de imagem (quando apropriado)
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            placeholder="https://…"
            className={inputClass}
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="imageText" className={labelClass}>
            O que você sabe sobre a obra? (opcional)
          </label>
          <textarea
            id="imageText"
            name="text"
            rows={3}
            placeholder="Ex.: parece um anime de ação com espadas…"
            className={inputClass}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            {pending ? "Identificando…" : "Identificar obra"}
          </button>
          {state && (
            <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={pending}
              className="h-11 rounded-full border border-black/[.08] px-6 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-white/[.06]"
            >
              🔄 Tentar novamente
            </button>
          )}
        </div>
      </form>

      {state?.message && (
        <p className="max-w-2xl rounded-2xl border border-black/[.08] p-4 text-sm text-zinc-600 dark:border-white/[.145] dark:text-zinc-300">
          {state.message}
        </p>
      )}

      {state?.visionAvailable === false && state?.attempted > 0 && (
        <p className="max-w-2xl rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          Este servidor ainda não tem reconhecimento automático de imagens ativo.
          Nenhuma análise visual da imagem foi realizada — os resultados abaixo
          (se houver) vêm da descrição usada na busca local do catálogo.
        </p>
      )}

      {state && state.results.length > 0 && (
        <ScoredResultGrid cards={state.results} />
      )}
    </div>
  );
}