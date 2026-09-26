"use client";

import { useActionState } from "react";

import { createWork } from "@/app/actions/works";
import {
  WORK_AGE_RATING_DESCRIPTIONS,
  WORK_AGE_RATING_LABELS,
  WORK_AGE_RATINGS,
  WORK_LANGUAGE_OPTIONS,
  WORK_PLATFORM_OPTIONS,
  WORK_STATUS_LABELS,
  WORK_TYPE_LABELS,
} from "@/lib/catalog-data";
import { GENRES } from "@/lib/preferences";

const inputClass =
  "rounded-lg border border-black/[.08] px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.145]";
const labelClass = "text-sm font-medium";

export default function CreateWorkForm() {
  const [state, formAction, pending] = useActionState(createWork, undefined);

  return (
    <form
      action={formAction}
      className="max-w-2xl rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]"
    >
      <h1 className="text-xl font-semibold tracking-tight">Cadastrar obra</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Ao salvar, todos os usuários recebem uma notificação. Quem tem a
        categoria como favorita recebe prioridade. Obras 18+ só são
        notificadas a contas que confirmam ser maiores de 18 anos.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        {WORK_AGE_RATINGS.map((value) => (
          <li key={value} className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
            {WORK_AGE_RATING_LABELS[value]} — {WORK_AGE_RATING_DESCRIPTIONS[value]}
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="title" className={labelClass}>
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
            maxLength={200}
            required
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className={labelClass}>
            Tipo
          </label>
          <select id="type" name="type" defaultValue="ANIME" className={inputClass}>
            {Object.keys(WORK_TYPE_LABELS).map((value) => (
              <option key={value} value={value}>
                {WORK_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select id="status" name="status" defaultValue="ONGOING" className={inputClass}>
            {Object.keys(WORK_STATUS_LABELS).map((value) => (
              <option key={value} value={value}>
                {WORK_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="ageRating" className={labelClass}>
            Classificação etária
          </label>
          <select id="ageRating" name="ageRating" defaultValue="LIVRE" className={inputClass}>
            {WORK_AGE_RATINGS.map((value) => (
              <option key={value} value={value}>
                {WORK_AGE_RATING_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="year" className={labelClass}>
            Ano
          </label>
          <input
            id="year"
            name="year"
            type="number"
            min={1900}
            max={2100}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="language" className={labelClass}>
            Idioma
          </label>
          <select id="language" name="language" defaultValue="" className={inputClass}>
            <option value="">Desconhecido</option>
            {WORK_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="platform" className={labelClass}>
            Plataforma
          </label>
          <select id="platform" name="platform" defaultValue="" className={inputClass}>
            <option value="">Desconhecida</option>
            {WORK_PLATFORM_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="availability" className={labelClass}>
            Disponibilidade
          </label>
          <input
            id="availability"
            name="availability"
            type="text"
            maxLength={120}
            placeholder="Ex.: Disponível no catálogo"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="titles" className={labelClass}>
            Títulos alternativos
          </label>
          <input
            id="titles"
            name="titles"
            type="text"
            placeholder="Separe por vírgula"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="coverUrl" className={labelClass}>
            URL da capa
          </label>
          <input
            id="coverUrl"
            name="coverUrl"
            type="url"
            placeholder="https://…"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="synopsis" className={labelClass}>
            Descrição
          </label>
          <textarea
            id="synopsis"
            name="synopsis"
            rows={4}
            maxLength={2000}
            className={inputClass}
          />
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Gêneros</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <label
              key={genre.value}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-black/[.08] px-3 py-1.5 text-sm dark:border-white/[.145]"
            >
              <input
                type="checkbox"
                name="genre"
                value={genre.value}
                className="accent-current"
              />
              {genre.label}
            </label>
          ))}
        </div>
      </fieldset>

      {state?.error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 h-11 w-full rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar obra"}
      </button>
    </form>
  );
}