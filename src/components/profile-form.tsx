"use client";

import Link from "next/link";
import { useActionState } from "react";

import { updateProfile } from "@/app/actions/profile";
import {
  ACCENT_OPTIONS,
  FAVORITE_CATEGORIES,
  THEME_OPTIONS,
  type FavoriteCategoryValue,
  type ThemePreference,
  type AccentPreference,
} from "@/lib/preferences";

const inputClass =
  "rounded-lg border border-black/[.08] px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.145]";
const labelClass = "text-sm font-medium";

export type ProfileFormValues = {
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  theme: ThemePreference;
  accent: AccentPreference;
  favoriteCategories: FavoriteCategoryValue[];
};

export default function ProfileForm({ initial }: { initial: ProfileFormValues }) {
  const [state, formAction] = useActionState(updateProfile, undefined);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]"
    >
      <h1 className="text-xl font-semibold tracking-tight">Editar perfil</h1>

      <div className="mt-5 flex items-center gap-4">
        {initial.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={initial.avatarUrl}
            alt="Foto de perfil atual"
            className="h-16 w-16 rounded-full object-cover ring-2 ring-black/[.08] dark:ring-white/[.145]"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-xl font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            ?
          </div>
        )}
        <label className="flex flex-1 cursor-pointer flex-col gap-1.5 text-sm">
          <span className={labelClass}>Trocar foto de perfil</span>
          <input
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className={inputClass}
          />
          {initial.avatarUrl && (
            <span className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <input
                type="checkbox"
                name="removeAvatar"
                id="removeAvatar"
                className="accent-current"
              />
              <label htmlFor="removeAvatar" className="cursor-pointer">
                Remover foto atual
              </label>
            </span>
          )}
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-1.5">
        <label htmlFor="bio" className={labelClass}>
          Biografia
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={500}
          defaultValue={initial.bio}
          placeholder="Um pouco sobre você"
          className={inputClass}
        />
      </div>

      <div className="mt-5 flex flex-col gap-1.5">
        <label htmlFor="banner" className={labelClass}>
          Fundo animado do perfil
        </label>
        <input
          id="banner"
          name="banner"
          type="text"
          defaultValue={initial.bannerUrl ?? ""}
          placeholder="https://… (imagem ou vídeo .mp4/.webm)"
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Cole a URL de uma imagem ou de um vídeo (🧾 .mp4/.webm/.gif). No
          computador ele fica de fundo do seu perfil; no celular, mostramos a
          primeira cena. Deixe em branco para remover.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="theme" className={labelClass}>
            Tema
          </label>
          <select
            id="theme"
            name="theme"
            defaultValue={initial.theme}
            className={inputClass}
          >
            {THEME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="accent" className={labelClass}>
            Cor de destaque
          </label>
          <select
            id="accent"
            name="accent"
            defaultValue={initial.accent}
            className={inputClass}
          >
            {ACCENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Categorias favoritas</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FAVORITE_CATEGORIES.map((category) => {
            const checked = initial.favoriteCategories.includes(category.value);
            return (
              <label
                key={category.value}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-black/[.08] px-3 py-1.5 text-sm dark:border-white/[.145]"
              >
                <input
                  type="checkbox"
                  name="category"
                  value={category.value}
                  defaultChecked={checked}
                  className="accent-current"
                />
                {category.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {state?.error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        <Link
          href="/profile"
          className="rounded-full px-5 py-2 text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-300"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          className="h-11 rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          Salvar
        </button>
      </div>
    </form>
  );
}