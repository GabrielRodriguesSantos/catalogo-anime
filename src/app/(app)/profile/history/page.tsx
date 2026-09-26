import type { Metadata } from "next";
import Link from "next/link";

import { getProfileHistory, requireUser } from "@/lib/dal";
import { formatDate, timeSince } from "@/lib/date";

export const metadata: Metadata = {
  title: "Meu histórico",
};

const ACTION_LABELS: Record<string, string> = {
  REGISTER: "Cadastro",
  LOGIN: "Login",
  LOGOUT: "Logout",
};

export default async function HistoryPage() {
  const user = await requireUser();
  const entries = await getProfileHistory(user.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/profile"
          className="text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          ← Voltar ao perfil
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Meu histórico
        </h1>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-black/[.08] p-6 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
          Nenhum registro por enquanto.
        </p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-black/[.08] px-5 py-3 dark:border-white/[.145]"
            >
              <span className="font-medium">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {entry.detail ? `${entry.detail} · ` : ""}
                {timeSince(entry.createdAt)} ({formatDate(entry.createdAt)})
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}