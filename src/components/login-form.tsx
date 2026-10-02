"use client";

import Link from "next/link";
import { useActionState } from "react";

import { login } from "@/app/actions/auth";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form
      action={formAction}
      className="w-full max-w-sm rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="identifier" className="text-sm font-medium">
          E-mail ou usuário
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          className="rounded-lg border border-black/[.08] px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.145]"
        />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border border-black/[.08] px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/[.145]"
        />
      </div>

      {state?.error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 h-11 w-full rounded-full bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>

      <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Ainda não tem conta?{" "}
        <Link href="/register" className="font-medium underline">
          Cadastrar
        </Link>
      </p>

      <p className="mt-5 text-center text-xs leading-relaxed text-zinc-500/80 dark:text-zinc-400/80">
        Site privado, sem fins lucrativos, criado para um grupo de amigos. Este
        projeto não hospeda obras, apenas lista onde assistir. Dúvidas ou
        sugestões: gabriel.newia@gmail.com
      </p>
    </form>
  );
}