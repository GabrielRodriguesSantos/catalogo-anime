"use client";

import Link from "next/link";
import { useActionState } from "react";

import { register } from "@/app/actions/auth";
import {
  ACCENT_OPTIONS,
  FAVORITE_CATEGORIES,
  THEME_OPTIONS,
} from "@/lib/preferences";

const inputClass =
  "rounded-lg border border-black/[.08] px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.145]";
const labelClass = "text-sm font-medium";

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, undefined);

  return (
    <form
      action={formAction}
      className="w-full max-w-lg rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]"
    >
      <h2 className="mb-1 text-xl font-semibold tracking-tight">
        Criar conta
      </h2>
      <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
        O site é privado e limitado a um grupo de amigos.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          <label htmlFor="username" className={labelClass}>
            Nome de usuário
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            minLength={3}
            maxLength={24}
            pattern="[A-Za-z0-9_\-]+"
            required
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-1">
          <label htmlFor="email" className={labelClass}>
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={labelClass}>
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Entre 8 e 72 caracteres.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className={labelClass}>
            Confirmar senha
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="bio" className={labelClass}>
          Biografia
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={500}
          placeholder="Um pouco sobre você (opcional)"
          className={inputClass}
        />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="avatar" className={labelClass}>
          Foto de perfil
        </label>
        <input
          id="avatar"
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          JPG, PNG, WebP ou GIF (máx. 2 MB). Opcional.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="theme" className={labelClass}>
            Tema
          </label>
          <select id="theme" name="theme" defaultValue="system" className={inputClass}>
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
          <select id="accent" name="accent" defaultValue="zinc" className={inputClass}>
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
          {FAVORITE_CATEGORIES.map((category) => (
            <label
              key={category.value}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-black/[.08] px-3 py-1.5 text-sm dark:border-white/[.145]"
            >
              <input
                type="checkbox"
                name="category"
                value={category.value}
                className="accent-current"
              />
              {category.label}
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
        {pending ? "Cadastrando…" : "Criar conta"}
      </button>

      <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}