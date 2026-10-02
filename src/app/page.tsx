import Link from "next/link";

import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/dal";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/date";
import { genreLabel, parsePreferences } from "@/lib/preferences";
import {
  WORK_AGE_RATING_LABELS,
  WORK_TYPE_LABELS,
} from "@/lib/catalog-data";

const SECTION_LINKS = [
  {
    href: "/obras",
    emoji: "📚",
    title: "Catálogo completo",
    description: "Todas as obras, com filtros e onde assistir.",
  },
  {
    href: "/profile/library",
    emoji: "⭐",
    title: "Favoritos e biblioteca",
    description: "Seus favoritos e o que você lê ou assiste.",
  },
  {
    href: "/chat",
    emoji: "💬",
    title: "Grupos e chat",
    description: "Converse com os amigos e compartilhe obras.",
  },
  {
    href: "/emojis",
    emoji: "😄",
    title: "Emojis (emojIA)",
    description: "Crie emojis personalizados com IA.",
  },
  {
    href: "/ajuda-ia",
    emoji: "🤖",
    title: "AjudaIA",
    description: "Encontre obras descrevendo com suas palavras.",
  },
  {
    href: "/profile",
    emoji: "👤",
    title: "Meu perfil",
    description: "Bio, fundo animado, preferências e notificações.",
  },
] as const;

const STATUS_TEMPLATES: Record<string, { prefix: string; emoji: string }> = {
  WATCHING: { prefix: "Assistindo", emoji: "📺" },
  REWATCHING: { prefix: "Revendo", emoji: "📺" },
  READING: { prefix: "Lendo", emoji: "📖" },
  REREADING: { prefix: "Relendo", emoji: "📖" },
  PLANNED: { prefix: "Planejando", emoji: "🗓️" },
  COMPLETED: { prefix: "Concluiu", emoji: "✅" },
  PAUSED: { prefix: "Pausou", emoji: "⏸️" },
  DROPPED: { prefix: "Deixou", emoji: "🚫" },
};

function initialOf(username: string): string {
  return username.charAt(0).toUpperCase();
}

function hueOf(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0;
  }
  return `${hash % 360}`;
}

type Member = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  favoriteCategory: { value: string; label: string } | null;
  status: string | null;
  adultVerified: boolean;
};

function buildMemberStatus(member: Member): { line: string; detail: string } {
  const memberSince = formatDate(member.createdAt);
  if (member.status) return { line: member.status, detail: `Membro desde ${memberSince}` };
  if (member.favoriteCategory) {
    return {
      line: `Fã de ${member.favoriteCategory.label}`,
      detail: `Membro desde ${memberSince}`,
    };
  }
  return { line: "Explorando o catálogo", detail: `Membro desde ${memberSince}` };
}

export default async function HomePage() {
  const user = await getCurrentUser();

  const [membersRows, libraryItems, recentWorks, currentProfile, adultWorks] =
    await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      select: {
        id: true,
        username: true,
        lastLoginAt: true,
        createdAt: true,
        profile: {
          select: { displayName: true, avatarUrl: true, adultVerified: true },
        },
        settings: { select: { data: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.libraryItem.findMany({
      select: {
        userId: true,
        status: true,
        work: { select: { title: true, ageRating: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.work.findMany({
      where: {
        title: { not: { contains: "Teste" } },
        ageRating: { not: "R18" },
      },
      select: {
        id: true,
        title: true,
        type: true,
        coverUrl: true,
        ageRating: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.profile.findUnique({
      where: { userId: user?.id ?? "" },
      select: { adultVerified: true },
    }),
    prisma.work.findMany({
      where: { ageRating: "R18" },
      select: {
        id: true,
        title: true,
        type: true,
        coverUrl: true,
        ageRating: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const memberStatuses = new Map<string, { status: string | null }>();
  for (const item of libraryItems) {
    if (!memberStatuses.has(item.userId)) {
      const template = item.status ? STATUS_TEMPLATES[item.status] : undefined;
      memberStatuses.set(item.userId, {
        status: template
          ? `${template.emoji} ${template.prefix}: ${item.work.title}`
          : null,
      });
    }
  }

  const members: Member[] = membersRows.map((member) => {
    const favorites = parsePreferences(member.settings?.data).favoriteCategories;
    return {
      username: member.username,
      displayName: member.profile?.displayName ?? null,
      avatarUrl: member.profile?.avatarUrl ?? null,
      lastLoginAt: member.lastLoginAt,
      createdAt: member.createdAt,
      favoriteCategory: favorites[0]
        ? { value: favorites[0], label: genreLabel(favorites[0]) }
        : null,
      status: memberStatuses.get(member.id)?.status ?? null,
      adultVerified: member.profile?.adultVerified === true,
    };
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-black/[.08] px-4 py-3 sm:px-6 dark:border-white/[.145]">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <img src="/api/brand/logo" alt="" className="h-8 w-8 rounded-xl" />
          <span className="sm:text-lg">
            {APP_NAME}
            <span className="text-accent">.</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/profile"
            className="rounded-full border border-black/[.08] px-3 py-1 transition-colors hover:border-accent/60 hover:text-accent dark:border-white/[.145]"
          >
            Perfil
          </Link>
          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="rounded-full border border-black/[.08] px-3 py-1 transition-colors hover:border-accent/60 hover:text-accent dark:border-white/[.145]"
            >
              🛠️ Admin
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full border border-black/[.08] px-3 py-1 transition-colors hover:border-accent hover:text-accent dark:border-white/[.145]"
            >
              Sair
            </button>
          </form>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Olá, {user?.username ?? "amigo"}! 👋
          </h1>
          <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            {APP_DESCRIPTION}
          </p>
        </div>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              👥 Membros do site
            </h2>
            <Link
              href="/chat"
              className="text-sm font-medium text-accent hover:underline"
            >
              Falar com todo mundo →
            </Link>
          </div>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {members.map((member, index) => {
              const status = buildMemberStatus(member);
              return (
                <Link
                  key={member.username}
                  href="/chat"
                  className="group flex w-36 shrink-0 flex-col items-center rounded-2xl border border-black/[.08] p-4 text-center transition-colors hover:border-accent/60 hover:bg-accent-soft dark:border-white/[.145]"
                >
                  <div
                    className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-2xl font-bold text-white ring-2 ring-black/[.08] dark:ring-white/[.145]"
                    style={
                      member.avatarUrl
                        ? undefined
                        : { backgroundColor: `hsl(${hueOf(member.username)} 70% 45%)` }
                    }
                  >
                    {member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.avatarUrl}
                        alt={`Foto de ${member.username}`}
                        className="avatar-hover h-full w-full object-cover"
                      />
                    ) : (
                      initialOf(member.username)
                    )}
                  </div>
                  <p className="mt-2 w-full truncate text-sm font-semibold">
                    {member.displayName ?? member.username}
                  </p>
                  <p className="mt-1 line-clamp-2 min-h-8 text-xs text-zinc-500 dark:text-zinc-400">
                    {status.line}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {status.detail}
                  </p>
                  {index === 0 && member.adultVerified && (
                    <span className="mt-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">
                      Criador
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              🎬 Obras no catálogo
            </h2>
            <Link
              href="/obras"
              className="text-sm font-medium text-accent hover:underline"
            >
              Ver todas as obras →
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recentWorks.map((work) => (
              <Link
                key={work.id}
                href={`/obras/${work.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-black/[.08] transition-colors hover:border-accent/60 dark:border-white/[.145]"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                  {work.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={work.coverUrl}
                      alt={work.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-4xl font-bold text-white/80"
                      style={{
                        background: `linear-gradient(160deg, hsl(${hueOf(work.title)} 65% 42%), hsl(${hueOf(work.title)} 65% 18%))`,
                      }}
                    >
                      {initialOf(work.title)}
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                    {WORK_TYPE_LABELS[work.type] ?? work.type}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
                    {work.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {WORK_AGE_RATING_LABELS[work.ageRating] ?? work.ageRating}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {currentProfile?.adultVerified && (
          <section className="mt-10">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                🔞 Conteúdo adulto (18+)
              </h2>
              <Link
                href="/obras"
                className="text-sm font-medium text-accent hover:underline"
              >
                Ver todas as obras →
              </Link>
            </div>
            <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {adultWorks.map((work) => (
                <Link
                  key={work.id}
                  href={`/obras/${work.id}`}
                  className="group w-32 shrink-0 sm:w-36"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
                    {work.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={work.coverUrl}
                        alt={work.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-4xl font-bold text-white/80"
                        style={{
                          background: `linear-gradient(160deg, hsl(${hueOf(work.title)} 65% 42%), hsl(${hueOf(work.title)} 65% 18%))`,
                        }}
                      >
                        {initialOf(work.title)}
                      </div>
                    )}
                    <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      18+
                    </span>
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">
                    {work.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {WORK_TYPE_LABELS[work.type] ?? work.type}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">
            🧭 Tudo o que você pode fazer
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SECTION_LINKS.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group flex min-h-24 flex-col justify-center gap-1 rounded-2xl border border-black/[.08] p-4 transition-colors hover:border-accent/60 hover:bg-accent-soft dark:border-white/[.145]"
              >
                <span className="text-xl">{section.emoji}</span>
                <span className="text-sm font-semibold">{section.title}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {section.description}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}