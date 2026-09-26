"use client";

import { useActionState } from "react";

import { setWorkAgeRating } from "@/app/actions/works";
import {
  WORK_AGE_RATINGS,
  WORK_AGE_RATING_LABELS,
  WORK_AGE_RATING_DESCRIPTIONS,
  WORK_TYPE_LABELS,
} from "@/lib/catalog-data";

type ManagerWork = {
  id: string;
  title: string;
  type: string;
  ageRating: string;
};

function WorkRatingRow({ work }: { work: ManagerWork }) {
  const [state, formAction, pending] = useActionState(setWorkAgeRating, null);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-black/[.08] p-3 dark:border-white/[.145]"
    >
      <input type="hidden" name="workId" value={work.id} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{work.title}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {WORK_TYPE_LABELS[work.type] ?? work.type} · atual:{" "}
          {WORK_AGE_RATING_LABELS[work.ageRating] ?? work.ageRating}
        </p>
      </div>
      <select
        name="ageRating"
        defaultValue={work.ageRating}
        disabled={pending}
        aria-label={`Classificação de ${work.title}`}
        className="rounded-lg border border-black/[.08] bg-background px-3 py-2 text-sm outline-none focus:border-foreground disabled:opacity-60 dark:border-white/[.145]"
      >
        {WORK_AGE_RATINGS.map((value) => (
          <option key={value} value={value}>
            {WORK_AGE_RATING_LABELS[value]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-white/[.06]"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
      {state?.ok === false && state.error && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}

export default function WorkRatingManager({
  works,
}: {
  works: ManagerWork[];
}) {
  if (works.length === 0) {
    return (
      <p className="rounded-xl border border-black/[.08] p-4 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
        Nenhuma obra cadastrada ainda.
      </p>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight">
        Classificação etária das obras
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        A classificação é controle de acesso e organização. Obras 18+ ficam
        invisíveis para contas que não confirmam ser maiores de 18 anos — em
        todas as áreas do site, e isso vale mesmo que o botão de cadastro esteja
        oculto no navegador.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {works.map((work) => (
          <WorkRatingRow key={work.id} work={work} />
        ))}
      </div>
      <ul className="mt-6 grid gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        {WORK_AGE_RATINGS.map((value) => (
          <li key={value}>
            <strong>{WORK_AGE_RATING_LABELS[value]}</strong> —{" "}
            {WORK_AGE_RATING_DESCRIPTIONS[value]}
          </li>
        ))}
      </ul>
    </section>
  );
}