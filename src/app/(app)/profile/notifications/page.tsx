import type { Metadata } from "next";
import Link from "next/link";

import {
  markAllNotificationsRead,
  markNotificationRead,
  archiveNotification,
  deleteNotification,
} from "@/app/actions/notifications";
import { getProfileNotifications, requireUser } from "@/lib/dal";
import { timeSince } from "@/lib/date";

export const metadata: Metadata = {
  title: "Minhas notificações",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ arquivadas?: string }>;
}) {
  const { arquivadas } = await searchParams;
  const archived = arquivadas === "1";

  const user = await requireUser();
  const notifications = await getProfileNotifications(user.id, { archived });

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/profile"
          className="text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          ← Voltar ao perfil
        </Link>
        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Minhas notificações
          </h1>
          {!archived && notifications.length > 0 && (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="text-sm font-medium text-zinc-500 underline dark:text-zinc-400"
              >
                Marcar todas como lidas
              </button>
            </form>
          )}
        </div>
        <div className="mt-2 flex gap-4 text-sm">
          <Link
            href="/profile/notifications"
            className={
              archived
                ? "text-zinc-500 underline dark:text-zinc-400"
                : "font-semibold"
            }
          >
            Ativas
          </Link>
          <Link
            href="/profile/notifications?arquivadas=1"
            className={
              archived
                ? "font-semibold"
                : "text-zinc-500 underline dark:text-zinc-400"
            }
          >
            Arquivadas
          </Link>
        </div>
      </div>

      {notifications.length === 0 ? (
        <p className="rounded-2xl border border-black/[.08] p-6 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
          {archived
            ? "Nenhuma notificação arquivada."
            : "Nenhuma notificação por enquanto."}
        </p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const unread = !notification.readAt;
            return (
              <li
                key={notification.id}
                className={`rounded-2xl border p-5 dark:border-white/[.145] ${
                  unread
                    ? "border-black/[.12] bg-black/[.02] dark:border-white/[.2] dark:bg-white/[.04]"
                    : "border-black/[.08]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {notification.title}
                      {notification.priority > 0 && (
                        <span className="ml-2 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                          Prioridade
                        </span>
                      )}
                      {unread && (
                        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-foreground align-middle" />
                      )}
                    </p>
                    {notification.message && (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        {notification.message}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                    {timeSince(notification.createdAt)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  {notification.link && (
                    <Link
                      href={notification.link}
                      className="font-medium underline"
                    >
                      Abrir
                    </Link>
                  )}
                  {unread && (
                    <form action={markNotificationRead}>
                      <input
                        type="hidden"
                        name="id"
                        value={notification.id}
                      />
                      <button
                        type="submit"
                        className="font-medium text-zinc-500 underline dark:text-zinc-400"
                      >
                        Marcar como lida
                      </button>
                    </form>
                  )}
                  {!archived && (
                    <form action={archiveNotification}>
                      <input
                        type="hidden"
                        name="id"
                        value={notification.id}
                      />
                      <button
                        type="submit"
                        className="font-medium text-zinc-500 underline dark:text-zinc-400"
                      >
                        Arquivar
                      </button>
                    </form>
                  )}
                  <form action={deleteNotification}>
                    <input type="hidden" name="id" value={notification.id} />
                    <button
                      type="submit"
                      className="font-medium text-red-600 underline dark:text-red-400"
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}