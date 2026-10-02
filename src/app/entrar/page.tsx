"use client";

import { useActionState } from "react";

import { submitSiteAccess } from "@/app/actions/gate";

export default function SiteAccessForm() {
  const [state, formAction, pending] = useActionState(submitSiteAccess, {});

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-2xl border border-black/[.08] p-6 text-center dark:border-white/[.145]"
      >
        <img
          src="/api/brand/logo"
          alt="Logo do Catálogo"
          className="mx-auto mb-4 h-16 w-16 rounded-full object-contain"
        />
        <h1 className="text-xl font-bold">Catálogo</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Este site é privado. Digite a senha de acesso para entrar.
        </p>

        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          placeholder="Senha de acesso"
          className="mt-5 w-full rounded-lg border border-black/[.08] px-3 py-2 text-center text-sm outline-none focus:border-foreground dark:border-white/[.145]"
        />

        {state?.error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 h-11 w-full rounded-full bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
        >
          {pending ? "Entrando…" : "Entrar no site"}
        </button>
      </form>
    </main>
  );
}