import "server-only";

import { prisma } from "@/lib/prisma";
import { isAdultRating, isAdultViewer } from "@/lib/content-gates";
import { genreLabel } from "@/lib/preferences";
import {
  ADULT_RATING,
  dbGenreNamesFromPillValues,
  splitTitles,
  type WorkCardItem,
} from "@/lib/catalog-data";

export {
  WORK_TYPE_LABELS,
  WORK_STATUS_LABELS,
  LIBRARY_SECTIONS,
  LIBRARY_STATUS_LABELS,
  ALL_LIBRARY_STATUSES,
  splitTitles,
  type LibraryStatusValue,
  type WorkCardItem,
} from "@/lib/catalog-data";

export const MAX_WORKS_PER_QUERY = 100;

export type WorkSearchInput = {
  userId: string;
  q?: string;
  type?: string;
  genres?: string[];
  status?: string;
  ageRating?: string;
  favoriteOnly?: boolean;
  skip?: number;
  take?: number;
};

export type SparseWork = {
  id: string;
  title: string;
  titles: string | null;
  type: string;
  coverUrl: string | null;
  synopsis: string | null;
  status: string;
  ageRating: string;
  availability: string | null;
  year: number | null;
  language: string | null;
  platform: string | null;
  genres: { genre: { name: string } }[];
};

export const SPARSE_WORK_SELECT = {
  id: true,
  title: true,
  titles: true,
  type: true,
  coverUrl: true,
  synopsis: true,
  status: true,
  ageRating: true,
  availability: true,
  year: true,
  language: true,
  platform: true,
  genres: { select: { genre: { select: { name: true } } } },
} as const;

export async function fetchSparseWorksByIds(
  ids: string[],
  options: { adult: boolean }
): Promise<SparseWork[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.work.findMany({
    where: { id: { in: ids } },
    select: SPARSE_WORK_SELECT,
  });
  const allowed = options.adult
    ? rows
    : rows.filter((row) => !isAdultRating(row.ageRating));
  const byId = new Map(allowed.map((row) => [row.id, row]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((row) => row as SparseWork);
}

export async function decorate(
  works: SparseWork[],
  userId: string
): Promise<WorkCardItem[]> {
  const adult = await isAdultViewer(userId);
  const visible = adult
    ? works
    : works.filter((work) => !isAdultRating(work.ageRating));

  const workIds = visible.map((work) => work.id);

  const [favorites, libraryItems] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId, workId: { in: workIds } },
      select: { workId: true },
    }),
    prisma.libraryItem.findMany({
      where: { userId, workId: { in: workIds } },
      select: { workId: true, status: true },
    }),
  ]);

  const favoriteIds = new Set(favorites.map((item) => item.workId));
  const libraryStatuses = new Map<string, string>();
  for (const item of libraryItems) {
    if (item.status && !libraryStatuses.has(item.workId)) {
      libraryStatuses.set(item.workId, item.status);
    }
  }

  return visible.map((work) => ({
    id: work.id,
    title: work.title,
    titles: splitTitles(work.titles),
    type: work.type,
    coverUrl: work.coverUrl,
    synopsis: work.synopsis,
    status: work.status,
    ageRating: work.ageRating,
    availability: work.availability,
    year: work.year,
    language: work.language,
    platform: work.platform,
    genres: work.genres.map((genre) => ({
      value: genre.genre.name,
      label: genreLabel(genre.genre.name),
    })),
    isFavorite: favoriteIds.has(work.id),
    libraryStatus: libraryStatuses.get(work.id) ?? null,
  }));
}

async function queryWorks(
  where: Record<string, unknown>,
  userId: string,
  skip: number,
  take: number
): Promise<{ items: WorkCardItem[]; total: number; hasMore: boolean }> {
  const adult = await isAdultViewer(userId);
  if (!adult) {
    const explicit = where.ageRating;
    where.ageRating =
      explicit && explicit !== ADULT_RATING
        ? explicit
        : { not: ADULT_RATING };
  }

  const [works, total] = await Promise.all([
    prisma.work.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        title: true,
        titles: true,
        type: true,
        coverUrl: true,
        synopsis: true,
        status: true,
        ageRating: true,
        availability: true,
        year: true,
        language: true,
        platform: true,
        genres: { select: { genre: { select: { name: true } } } },
      },
    }),
    prisma.work.count({ where }),
  ]);

  const items = await decorate(works, userId);
  return { items, total, hasMore: skip + items.length < total };
}

const WORK_SELECT = {
  id: true,
  title: true,
  titles: true,
  type: true,
  coverUrl: true,
  synopsis: true,
  status: true,
  ageRating: true,
  availability: true,
  year: true,
  language: true,
  platform: true,
  genres: { select: { genre: { select: { name: true } } } },
} as const;

export async function findWorkDecoratedById(
  workId: string,
  userId: string
): Promise<WorkCardItem | null> {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: WORK_SELECT,
  });
  if (!work) return null;

  const adult = await isAdultViewer(userId);
  if (!adult && isAdultRating(work.ageRating)) return null;

  const decorated = await decorate([work], userId);
  return decorated[0];
}

export async function findWorks(input: WorkSearchInput): Promise<{
  items: WorkCardItem[];
  total: number;
  hasMore: boolean;
}> {
  const skip = Math.max(0, Number(input.skip) || 0);
  const take = Math.min(Math.max(1, Number(input.take) || 24), MAX_WORKS_PER_QUERY);
  const q = (input.q ?? "").trim();
  const type = (input.type ?? "").trim();
  const status = (input.status ?? "").trim();
  const ageRating = (input.ageRating ?? "").trim();
  const genres = dbGenreNamesFromPillValues(input.genres ?? []);

  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [{ title: { contains: q } }, { titles: { contains: q } }];
  }
  if (type) where.type = type;
  if (status) where.status = status;
  if (ageRating) where.ageRating = ageRating;
  if (genres.length > 0) {
    where.genres = { some: { genre: { name: { in: genres } } } };
  }
  if (input.favoriteOnly) {
    where.favorites = { some: { userId: input.userId } };
  }

  return queryWorks(where, input.userId, skip, take);
}

export async function findUserLibrary(
  userId: string,
  input: Omit<WorkSearchInput, "userId">
): Promise<{ items: WorkCardItem[]; total: number; hasMore: boolean }> {
  const skip = Math.max(0, Number(input.skip) || 0);
  const take = Math.min(Math.max(1, Number(input.take) || 24), MAX_WORKS_PER_QUERY);
  const q = (input.q ?? "").trim();
  const type = (input.type ?? "").trim();
  const section = (input.status ?? "").trim();
  const genres = dbGenreNamesFromPillValues(input.genres ?? []);
  const favoriteOnly = Boolean(input.favoriteOnly);

  const workWhere: Record<string, unknown> = {};

  if (q) {
    workWhere.OR = [{ title: { contains: q } }, { titles: { contains: q } }];
  }
  if (type) workWhere.type = type;

  if (favoriteOnly) {
    workWhere.favorites = { some: { userId } };
  } else {
    workWhere.libraryItems = { some: { userId } };
  }

  if (genres.length > 0) {
    workWhere.genres = { some: { genre: { name: { in: genres } } } };
  }

  if (section) {
    const statuses =
      section === "WATCHING_READING" ? ["WATCHING", "READING"] : [section];
    if (favoriteOnly) {
      workWhere.favorites = {
        some: {
          userId,
          work: { libraryItems: { some: { userId, status: { in: statuses } } } },
        },
      };
    } else {
      workWhere.libraryItems = {
        some: { userId, status: { in: statuses } },
      };
    }
  }

  return queryWorks(workWhere, userId, skip, take);
}