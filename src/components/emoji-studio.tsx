"use client";

import { useActionState } from "react";

import {
  deleteEmoji,
  generateEmoji,
  saveEmoji,
  setProfileEmoji,
  type EmojiaResult,
} from "@/app/actions/emojis";

/* eslint-disable @next/next/no-img-element */

export type EmojiListItem = {
  id: string;
  name: string;
  prompt: string;
  imagePath: string;
  mime: string;
  createdAt: string;
  usageCount: number;
  usedOnProfile: boolean;
};

export function EmojiStudio({
  userEmojis,
}: {
  userEmojis: EmojiListItem[];
}) {
  const [generateState, generateAction, generatePending] = useActionState(
    generateEmoji,
    null
  );
  const [saveState, saveAction, savePending] = useActionState(saveEmoji, null);

  const result = generateState as EmojiaResult | null;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Emojis com emojIA 🎨
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Gere emojis por IA, salve na sua coleção e use no chat ou no perfil.
        </p>
      </header>

      <section className="rounded-3xl border border-black/[.08] p-6 dark:border-white/[.145]">
        <form id="emojia-form" action={generateAction} className="flex gap-2">
          <input
            name="prompt"
            placeholder="Ex.: um rato gamer agitando controle"
            required
            aria-label="Descreva o emoji"
            className="flex-1 rounded-2xl border border-black/[.08] px-4 py-3 text-sm outline-none dark:border-white/[.145]"
          />
          <button
            type="submit"
            disabled={generatePending}
            className="rounded-2xl bg-foreground px-6 py-3 text-sm font-medium text-background disabled:opacity-50"
          >
            {generatePending ? "Gerando…" : "Gerar emoji"}
          </button>
          <button
            type="submit"
            disabled={generatePending}
            className="rounded-2xl border border-black/[.08] px-4 py-3 text-sm font-medium dark:border-white/[.145]"
          >
            Tentar novamente
          </button>
        </form>

        {result && !result.ok && (
          <p
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
            role="alert"
          >
            {result.error}
          </p>
        )}

        {result && result.ok && result.pendingPath && (
          <div className="mt-5 rounded-3xl border border-black/[.08] p-5 dark:border-white/[.145]">
            <p className="mb-2 text-sm font-medium">Prévia gerada:</p>
            <img
              src={result.pendingPath}
              alt={result.name}
              className="h-28 w-28 rounded-2xl border border-black/[.08] object-contain dark:border-white/[.145]"
            />
            <form action={saveAction} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="imagePath" value={result.pendingPath} />
              <input type="hidden" name="prompt" value={result.name} />
              <span className="text-sm">Nome:</span>
              <input
                name="name"
                defaultValue={result.name}
                maxLength={24}
                aria-label="Nome do emoji"
                className="rounded-xl border border-black/[.08] px-3 py-2 text-sm outline-none dark:border-white/[.145]"
              />
              <button
                type="submit"
                disabled={savePending}
                className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                Salvar emoji
              </button>
            </form>
            {saveState && !saveState.ok && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {saveState.error}
              </p>
            )}
            {saveState && saveState.ok && (
              <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                Emoji salvo! Já aparece no chat e abaixo.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Minha coleção</h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {userEmojis.length} emoji(s)
          </span>
        </div>
        {userEmojis.length === 0 ? (
          <p className="rounded-2xl border border-black/[.08] p-6 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
            Nenhum emoji salvo ainda. Gere ou salve acima. Você também pode usá-los
            no chat clicando em 🎨 na barra de mensagens.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {userEmojis.map((emoji) => (
              <li
                key={emoji.id}
                className="flex flex-col items-center gap-2 rounded-3xl border border-black/[.08] p-4 dark:border-white/[.145]"
              >
                <img
                  src={emoji.imagePath}
                  alt={emoji.name}
                  className="h-16 w-16 object-contain"
                />
                <p className="w-full truncate text-center text-sm font-medium">
                  {emoji.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  usado {emoji.usageCount}x no chat
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs">
                  {emoji.usedOnProfile ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      ✓ no perfil
                    </span>
                  ) : (
                    <form action={setProfileEmoji}>
                      <input type="hidden" name="id" value={emoji.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-black/[.08] px-3 py-1 font-medium dark:border-white/[.145]"
                      >
                        Usar no perfil
                      </button>
                    </form>
                  )}
                  <form action={deleteEmoji}>
                    <input type="hidden" name="id" value={emoji.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-red-200 px-3 py-1 font-medium text-red-600 dark:border-red-900 dark:text-red-400"
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}