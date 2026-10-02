import type { ReactNode } from "react";
import Link from "next/link";

import { logout } from "@/app/actions/auth";
import { NotificationsBell } from "@/components/notifications-bell";
import { requireUser } from "@/lib/dal";
import { APP_NAME } from "@/lib/config";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-black/[.08] px-4 py-3 sm:px-6 dark:border-white/[.145]">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <img src="/api/brand/logo" alt="" className="h-8 w-8 rounded-xl" />
          <span className="sm:text-lg">
            {APP_NAME}
            <span className="text-accent">.</span>
          </span>
        </Link>
        <div className="order-3 w-full sm:order-none sm:w-auto sm:min-w-0 sm:flex-1 sm:justify-center sm:px-4">
          <form
            action="/pesquisa"
            method="get"
            className="flex w-full max-w-md items-center gap-2 rounded-full border border-black/[.08] px-3 py-1.5 dark:border-white/[.145]"
          >
            <input
              name="q"
              type="search"
              placeholder="Buscar obra, vídeo, imagem…"
              aria-label="Buscar obra"
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
            <button
              type="submit"
              aria-label="Pesquisar"
              className="shrink-0 text-sm text-accent"
            >
              🔎
            </button>
          </form>
        </div>
        <nav className="order-2 flex flex-wrap items-center justify-center gap-2 text-sm sm:order-none sm:justify-end sm:gap-3">
          <Link
            href="/obras"
            className="rounded-full border border-black/[.08] px-3 py-1 transition-colors hover:border-accent/60 hover:text-accent sm:px-4 sm:py-1.5 dark:border-white/[.145]"
          >
            Catálogo
          </Link>
          <Link
            href="/chat"
            className="rounded-full border border-black/[.08] px-3 py-1 transition-colors hover:border-accent/60 hover:text-accent sm:px-4 sm:py-1.5 dark:border-white/[.145]"
          >
            Conversas
          </Link>
          <Link
            href="/emojis"
            className="rounded-full border border-black/[.08] px-3 py-1 transition-colors hover:border-accent/60 hover:text-accent sm:px-4 sm:py-1.5 dark:border-white/[.145]"
          >
            Emojis
          </Link>
          <Link
            href="/ajuda-ia"
            className="rounded-full border border-black/[.08] px-3 py-1 transition-colors hover:border-accent/60 hover:text-accent sm:px-4 sm:py-1.5 dark:border-white/[.145]"
          >
            🤖 AjudaIA
          </Link>
          <Link
            href="/profile"
            className="rounded-full border border-black/[.08] px-3 py-1 transition-colors hover:border-accent/60 hover:text-accent sm:px-4 sm:py-1.5 dark:border-white/[.145]"
          >
            Perfil
          </Link>
          <NotificationsBell />
          {user.role === "ADMIN" && (
            <Link
              href="/admin/works"
              className="rounded-full bg-accent px-3 py-1 font-medium text-white transition-colors hover:bg-accent-dark sm:px-4 sm:py-1.5"
            >
              Cadastrar obra
            </Link>
          )}
          <span className="text-zinc-500 dark:text-zinc-400">
            {user.username}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full border border-black/[.08] px-3 py-1 transition-colors hover:border-accent hover:text-accent sm:px-4 sm:py-1.5 dark:border-white/[.145]"
            >
              Sair
            </button>
          </form>
        </nav>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}