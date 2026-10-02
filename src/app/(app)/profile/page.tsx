import type { Metadata } from "next";
import Link from "next/link";

import { getUnreadNotificationCount, getProfileData, requireUser } from "@/lib/dal";
import { formatDate, timeSince } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import {
  ACCENT_OPTIONS,
  FAVORITE_CATEGORIES,
  parsePreferences,
  THEME_OPTIONS,
} from "@/lib/preferences";

export const metadata: Metadata = {
  title: "Perfil",
};

function labelOf<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string | undefined
): string {
  return options.find((option) => option.value === value)?.label ?? "—";
}

function hexOf(value: string | undefined): string | undefined {
  return ACCENT_OPTIONS.find((option) => option.value === value)?.hex;
}

const VIDEO_URL_REGEX = /\.(mp4|webm|ogv|mov|m4v)(\?.*)?$/i;

function isVideoUrl(url: string): boolean {
  return VIDEO_URL_REGEX.test(url);
}

export default async function ProfilePage() {
  const currentUser = await requireUser();
  const profileData = await getProfileData(currentUser.id);
  const unreadNotifications = await getUnreadNotificationCount(currentUser.id);

  if (!profileData) {
    return <p className="px-6 py-10 text-center text-zinc-500">Perfil não encontrado.</p>;
  }

  const preferences = parsePreferences(profileData.settings?.data);
  const avatarUrl = profileData.profile?.avatarUrl;
  const bannerUrl = profileData.profile?.bannerUrl;
  const bio = profileData.profile?.bio;
  const initial = profileData.username.charAt(0).toUpperCase();

  const allSettingsRows = await prisma.userSetting.findMany({
    select: { data: true },
  });
  const categoryCounts = new Map<string, number>();
  for (const row of allSettingsRows) {
    for (const category of parsePreferences(row.data).favoriteCategories) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }
  const ranking = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="overflow-hidden rounded-2xl border border-black/[.08] dark:border-white/[.145]">
        {bannerUrl && (
          <div className="h-40 w-full overflow-hidden border-b border-black/[.08] dark:border-white/[.145]">
            {isVideoUrl(bannerUrl) ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={bannerUrl}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
        )}
        <div className="p-6">
        <div className="flex items-start gap-5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={`Foto de ${profileData.username}`}
              className="avatar-hover h-20 w-20 rounded-full object-cover ring-2 ring-black/[.08] dark:ring-white/[.145]"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-200 text-2xl font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {initial}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {profileData.username}
              {currentUser.role === "ADMIN" && (
                <span
                  title="Administrador do site"
                  className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 align-middle text-xs font-bold text-white"
                >
                  👑 AMN
                </span>
              )}
            </h1>
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
              {profileData.email}
            </p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Membro desde {formatDate(profileData.createdAt)}
              <span className="mx-1 text-zinc-400">·</span>
              <span className="font-medium">
                {timeSince(profileData.createdAt)}
              </span>
            </p>
          </div>

          {currentUser.role === "ADMIN" && (
            <span className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium dark:border-white/[.145]">
              Admin
            </span>
          )}
        </div>

        {bio ? (
          <p className="mt-5 whitespace-pre-wrap border-t border-black/[.08] pt-5 text-sm text-zinc-700 dark:border-white/[.145] dark:text-zinc-200">
            {bio}
          </p>
        ) : (
          <p className="mt-5 border-t border-black/[.08] pt-5 text-sm italic text-zinc-400 dark:border-white/[.145]">
            Sem biografia.
          </p>
        )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Preferências
        </h2>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-zinc-500 dark:text-zinc-400">Tema</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {labelOf(THEME_OPTIONS, preferences.theme)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500 dark:text-zinc-400">Cor de destaque</dt>
            <dd className="mt-0.5 flex items-center gap-2 text-sm font-medium">
              <span
                aria-hidden
                className="inline-block h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: hexOf(preferences.accent) ?? "#71717a" }}
              />
              {labelOf(ACCENT_OPTIONS, preferences.accent)}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">
            Categorias favoritas
          </dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            {preferences.favoriteCategories.length === 0 ? (
              <span className="text-sm italic text-zinc-400">Nenhuma selecionada.</span>
            ) : (
              preferences.favoriteCategories.map((value) => (
                <span
                  key={value}
                  className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium dark:border-white/[.145]"
                >
                  {labelOf(FAVORITE_CATEGORIES, value)}
                </span>
              ))
            )}
          </dd>
        </div>
      </div>

      {ranking.length > 0 && (
        <div className="mt-5 rounded-2xl border border-black/[.08] p-6 dark:border-white/[.145]">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            🏆 Categorias mais escolhidas do grupo
          </h2>
          <ol className="flex flex-col gap-2">
            {ranking.map(([value, count], index) => (
              <li
                key={value}
                className="flex items-center justify-between rounded-xl border border-black/[.08] px-4 py-2.5 text-sm dark:border-white/[.145]"
              >
                <span className="flex items-center gap-2 font-medium">
                  <span className="w-5 text-center">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}º`}
                  </span>
                  {labelOf(FAVORITE_CATEGORIES, value)}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {count} {count === 1 ? "pessoa" : "pessoas"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {currentUser.role === "ADMIN" && (
        <Link
          href="/admin"
          className="mt-5 flex items-center justify-between rounded-2xl border border-accent/40 bg-accent-soft p-4 text-sm font-medium transition-colors hover:bg-accent-soft/60 dark:border-accent/40"
        >
          <span>🛠️ Painel do administrador</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            acesso por senha restrita
          </span>
        </Link>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Link
          href="/profile/library"
          className="rounded-2xl border border-black/[.08] p-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
        >
          Minha biblioteca
        </Link>
        <Link
          href="/profile/history"
          className="rounded-2xl border border-black/[.08] p-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
        >
          Meu histórico
        </Link>
        <Link
          href="/profile/notifications"
          className="flex items-center justify-between rounded-2xl border border-black/[.08] p-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
        >
          Notificações
          {unreadNotifications > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-xs font-semibold text-background">
              {unreadNotifications}
            </span>
          )}
        </Link>
      </div>

      <div className="mt-5 flex justify-end">
        <Link
          href="/profile/edit"
          className="rounded-full border border-black/[.08] px-5 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
        >
          Editar perfil
        </Link>
      </div>
    </div>
  );
}