import { promises as fs } from "node:fs";
import path from "node:path";

import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: "./prisma/dev.db" }),
  log: ["error"],
});

const QUERY = `
query ($page: Int, $perPage: Int, $genre: String, $tag: String, $type: MediaType, $sort: [MediaSort!]) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(type: $type, genre: $genre, tag: $tag, sort: $sort) {
      id
      title { romaji english }
      coverImage { extraLarge }
      description(asHtml: false)
      status
      startDate { year }
      isAdult
      genres
      averageScore
    }
  }
}
`;

type Category = {
  value: string;
  label: string;
  anilist: string;
  target: number;
  defaultAge: "R12" | "R14" | "R16" | "R18";
  filter: { genre?: string; tag?: string };
};

const CATEGORIES: Category[] = [
  { value: "acao", label: "Ação", anilist: "Action", target: 520, defaultAge: "R14", filter: { genre: "Action" } },
  { value: "aventura", label: "Aventura", anilist: "Adventure", target: 520, defaultAge: "R12", filter: { genre: "Adventure" } },
  { value: "fantasia", label: "Fantasia", anilist: "Fantasy", target: 520, defaultAge: "R12", filter: { genre: "Fantasy" } },
  { value: "comedia", label: "Comédia", anilist: "Comedy", target: 520, defaultAge: "R12", filter: { genre: "Comedy" } },
  { value: "drama", label: "Drama", anilist: "Drama", target: 520, defaultAge: "R12", filter: { genre: "Drama" } },
  { value: "romance", label: "Romance", anilist: "Romance", target: 520, defaultAge: "R12", filter: { genre: "Romance" } },
  { value: "misterio", label: "Mistério", anilist: "Mystery", target: 520, defaultAge: "R14", filter: { genre: "Mystery" } },
  { value: "suspense", label: "Suspense", anilist: "Thriller", target: 520, defaultAge: "R16", filter: { genre: "Thriller" } },
  { value: "scifi", label: "Ficção científica", anilist: "Sci-Fi", target: 520, defaultAge: "R12", filter: { genre: "Sci-Fi" } },
  { value: "isekai", label: "Isekai", anilist: "Isekai", target: 520, defaultAge: "R12", filter: { tag: "Isekai" } },
  { value: "escolar", label: "Escolar", anilist: "School", target: 520, defaultAge: "R12", filter: { tag: "School" } },
  { value: "esporte", label: "Esportes", anilist: "Sports", target: 520, defaultAge: "R12", filter: { genre: "Sports" } },
  { value: "horror", label: "Horror", anilist: "Horror", target: 520, defaultAge: "R16", filter: { genre: "Horror" } },
  { value: "historico", label: "Histórico", anilist: "Historical", target: 520, defaultAge: "R12", filter: { tag: "Historical" } },
  { value: "outros", label: "Outros", anilist: "Psychological", target: 520, defaultAge: "R16", filter: { genre: "Psychological" } },
];

const TYPES = [
  { db: "ANIME" as const, anilist: "ANIME" },
  { db: "MANGA" as const, anilist: "MANGA" },
];

/**
 * Categorias do site que não têm gênero equivalente no AniList (ou têm poucas
 * obras) usam tags para completar a meta de 500+ por categoria/tipo.
 */
const SUPPLEMENTS: Array<{
  categoryValue: string;
  type: "ANIME" | "MANGA";
  filter: { genre?: string; tag?: string };
  genreName: string;
}> = [
  { categoryValue: "suspense", type: "ANIME", filter: { tag: "Suspense" }, genreName: "Suspense" },
  { categoryValue: "suspense", type: "MANGA", filter: { tag: "Suspense" }, genreName: "Suspense" },
  { categoryValue: "historico", type: "ANIME", filter: { tag: "Historical Era" }, genreName: "Historical" },
  { categoryValue: "historico", type: "MANGA", filter: { tag: "Historical Era" }, genreName: "Historical" },
  { categoryValue: "escolar", type: "ANIME", filter: { tag: "School Life" }, genreName: "School" },
  { categoryValue: "escolar", type: "MANGA", filter: { tag: "School Life" }, genreName: "School" },
  { categoryValue: "isekai", type: "ANIME", filter: { tag: "Alternate World" }, genreName: "Isekai" },
  { categoryValue: "isekai", type: "MANGA", filter: { tag: "Alternate World" }, genreName: "Isekai" },
  { categoryValue: "romance", type: "ANIME", filter: { tag: "Romantic Comedy" }, genreName: "Romance" },
  { categoryValue: "romance", type: "MANGA", filter: { tag: "Romantic Comedy" }, genreName: "Romance" },
  { categoryValue: "esporte", type: "ANIME", filter: { tag: "Sports" }, genreName: "Sports" },
  { categoryValue: "esporte", type: "MANGA", filter: { tag: "Sports" }, genreName: "Sports" },
  { categoryValue: "comedia", type: "ANIME", filter: { tag: "Comedy" }, genreName: "Comedy" },
  { categoryValue: "comedia", type: "MANGA", filter: { tag: "Comedy" }, genreName: "Comedy" },
  { categoryValue: "drama", type: "ANIME", filter: { tag: "Drama" }, genreName: "Drama" },
  { categoryValue: "drama", type: "MANGA", filter: { tag: "Drama" }, genreName: "Drama" },
  { categoryValue: "horror", type: "ANIME", filter: { tag: "Horror" }, genreName: "Horror" },
  { categoryValue: "horror", type: "MANGA", filter: { tag: "Horror" }, genreName: "Horror" },
  { categoryValue: "fantasia", type: "ANIME", filter: { tag: "Isekai" }, genreName: "Fantasy" },
  { categoryValue: "fantasia", type: "MANGA", filter: { tag: "Isekai" }, genreName: "Fantasy" },
  { categoryValue: "acao", type: "ANIME", filter: { tag: "Action" }, genreName: "Action" },
  { categoryValue: "acao", type: "MANGA", filter: { tag: "Action" }, genreName: "Action" },
  { categoryValue: "aventura", type: "ANIME", filter: { tag: "Adventure" }, genreName: "Adventure" },
  { categoryValue: "aventura", type: "MANGA", filter: { tag: "Adventure" }, genreName: "Adventure" },
  { categoryValue: "scifi", type: "ANIME", filter: { tag: "Sci-Fi" }, genreName: "Sci-Fi" },
  { categoryValue: "scifi", type: "MANGA", filter: { tag: "Sci-Fi" }, genreName: "Sci-Fi" },
  { categoryValue: "misterio", type: "ANIME", filter: { tag: "Mystery" }, genreName: "Mystery" },
  { categoryValue: "misterio", type: "MANGA", filter: { tag: "Mystery" }, genreName: "Mystery" },
  { categoryValue: "outros", type: "ANIME", filter: { tag: "Psychological" }, genreName: "Psychological" },
  { categoryValue: "outros", type: "MANGA", filter: { tag: "Psychological" }, genreName: "Psychological" },
];

const PAGE_SIZE = 50;
const MAX_PAGES_PER_CATEGORY = 16;
const SLEEP_MS = 2100;
const CONCURRENCY = 6;
const SORTS = ["POPULARITY_DESC", "TRENDING_DESC", "ID_DESC"];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(
  page: number,
  filter: { genre?: string; tag?: string },
  anilistType: string,
  sort: string
): Promise<{
  media: Array<Record<string, unknown>>;
  hasNextPage: boolean;
} | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "catalogo-anime/0.1",
        },
        body: JSON.stringify({
          query: QUERY,
          variables: {
            page,
            perPage: PAGE_SIZE,
            genre: filter.genre ?? null,
            tag: filter.tag ?? null,
            type: anilistType,
            sort: [sort],
          },
        }),
      });
      if (res.status === 429) {
        await sleep(7000 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      const json = await res.json();
      if (json.errors) return null;
      const payload = json.data.Page;
      return {
        media: payload.media ?? [],
        hasNextPage: Boolean(payload.pageInfo?.hasNextPage),
      };
    } catch {
      await sleep(7000 * (attempt + 1));
    }
  }
  return null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

const STATUS: Record<string, "ONGOING" | "COMPLETED" | "HIATUS" | "CANCELLED" | "UNKNOWN"> = {
  RELEASING: "ONGOING",
  FINISHED: "COMPLETED",
  HIATUS: "HIATUS",
  CANCELLED: "CANCELLED",
  NOT_YET_RELEASED: "UNKNOWN",
};

function cleanSynopsis(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let text = raw
    .replace(/\*\*/g, "")
    .replace(/^~!|!~$/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
  if (text.length > 420) text = `${text.slice(0, 417).trimEnd()}...`;
  return text || null;
}

const stats = { created: 0, updated: 0, covers: 0, reused: 0, failed: 0 };

async function writeCover(media: Record<string, unknown>, key: string): Promise<string | null> {
  const cover = media.coverImage as { extraLarge?: string } | null;
  const url = cover?.extraLarge;
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1500) return null;
    const ext = /\.png(\?|$)/i.test(url) ? "png" : "jpg";
    const dir = path.join(process.cwd(), "public", "uploads", "discovery");
    await fs.mkdir(dir, { recursive: true });
    const filename = `c${key}.${ext}`;
    await fs.writeFile(path.join(dir, filename), buffer);
    stats.covers++;
    return `/uploads/discovery/${filename}`;
  } catch {
    return null;
  }
}

async function upsertMedia(
  media: Record<string, unknown>,
  dbType: "ANIME" | "MANGA",
  category: Category,
  genreId: string
): Promise<boolean> {
  const titleData = media.title as { romaji?: string; english?: string } | null;
  const title = titleData?.romaji || titleData?.english;
  if (!title) return false;

  const anilistId = String(media.id);

  const byExternal = await prisma.work.findFirst({
    where: { externalIds: { contains: `anilist:${anilistId}` } },
    select: { id: true, coverUrl: true, externalIds: true },
    orderBy: { createdAt: "asc" },
  });

  const existing = byExternal
    ? byExternal
    : await prisma.work.findFirst({
        where: { title, type: dbType },
        select: { id: true, coverUrl: true, externalIds: true },
      });

  if (existing?.coverUrl) {
    if (!byExternal) {
      await prisma.work.update({
        where: { id: existing.id },
        data: {
          externalIds: existing.externalIds
            ? `${existing.externalIds},anilist:${anilistId}`
            : `anilist:${anilistId}`,
        },
      });
    }
    const linked = await prisma.workGenre.findUnique({
      where: {
        workId_genreId: { workId: existing.id, genreId },
      },
      select: { workId: true },
    });
    if (linked) {
      stats.reused++;
      return true;
    }
    await prisma.workGenre.create({
      data: { workId: existing.id, genreId },
    });
    stats.reused++;
    return true;
  }

  const ageRating = media.isAdult === true ? "R18" : category.defaultAge;
  const base = {
    synopsis: cleanSynopsis(media.description),
    status: STATUS[String(media.status)] ?? "UNKNOWN",
    year: (media.startDate as { year?: number })?.year ?? null,
    rating: typeof media.averageScore === "number" ? media.averageScore / 10 : null,
    ageRating: ageRating as "R12" | "R14" | "R16" | "R18",
  };

  const coverUrl = await writeCover(media, slugify(`${title}-${dbType}`));

  if (existing) {
    await prisma.work.update({
      where: { id: existing.id },
      data: {
        ...base,
        coverUrl: coverUrl ?? existing.coverUrl,
        externalIds: existing.externalIds
          ? `${existing.externalIds},anilist:${anilistId}`
          : `anilist:${anilistId}`,
      },
    });
    stats.updated++;
  } else {
    const created = await prisma.work.create({
      data: {
        ...base,
        coverUrl,
        type: dbType,
        title,
        titles: titleData?.english && titleData.english !== title ? titleData.english : null,
        language: "ja",
        platform: dbType === "ANIME" ? "Crunchyroll" : "Amazon Manga",
        externalIds: `anilist:${anilistId}`,
        genres: { create: [{ genreId }] },
      },
    });
    stats.created++;
    return true;
  }

  const rows = (Array.isArray(media.genres) ? media.genres : [])
    .slice(0, 5)
    .map((name: string) => ({ name }));
  for (const row of rows) {
    const genre = await prisma.genre.upsert({
      where: { name: row.name },
      update: {},
      create: { name: row.name },
    });
    await prisma.workGenre.upsert({
      where: { workId_genreId: { workId: existing.id, genreId: genre.id } },
      update: {},
      create: { workId: existing.id, genreId: genre.id },
    });
  }
  return true;
}

async function fillToTarget(
  category: Category,
  type: { db: "ANIME" | "MANGA"; anilist: string },
  filter: { genre?: string; tag?: string },
  genreName: string,
  target: number,
  startCollected: number,
  seen: Set<string>,
  label: string
) {
  const genre = await prisma.genre.upsert({
    where: { name: genreName },
    update: {},
    create: { name: genreName },
  });

  let collected = startCollected;

  for (const sort of SORTS) {
    const phaseTarget = Math.min(
      target,
      collected + Math.max(120, Math.ceil(target / SORTS.length))
    );

    for (let page = 1; page <= MAX_PAGES_PER_CATEGORY; page++) {
      if (collected >= phaseTarget) break;
      const data = await fetchPage(page, filter, type.anilist, sort);
      await sleep(SLEEP_MS);
      if (!data) {
        console.log(`↷ ${label}/${type.db} ${sort} p${page}: falha na API`);
        continue;
      }

      const batch = data.media.filter((media) => {
        const titleData = media.title as { romaji?: string; english?: string } | null;
        const key = `${titleData?.romaji ?? titleData?.english ?? "?"}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      for (let i = 0; i < batch.length && collected < phaseTarget; i += CONCURRENCY) {
        const chunk = batch.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          chunk.map((media) =>
            upsertMedia(media, type.db, category, genre.id).catch(() => false)
          )
        );
        for (const ok of results) {
          if (ok) collected++;
          else stats.failed++;
        }
      }

      console.log(
        `✓ ${label} · ${type.db} · ${sort} p${page}: ${collected}/${target} (novas=${stats.created} · capas=${stats.covers})`
      );

      if (!data.hasNextPage) break;
    }
  }
  return collected;
}

async function seedCategoryType(
  category: Category,
  type: { db: "ANIME" | "MANGA"; anilist: string }
) {
  return fillToTarget(
    category,
    type,
    category.filter,
    category.anilist,
    category.target,
    0,
    new Set<string>(),
    category.label
  );
}

async function countCategoryWorks(genreName: string, type: "ANIME" | "MANGA") {
  return prisma.work.count({
    where: { type, genres: { some: { genre: { name: genreName } } } },
  });
}

async function main() {
  console.log(
    "Semeando catálogo completo (populares + trending + obras obscuras)…"
  );
  const summary: string[] = [];

  for (const type of TYPES) {
    for (const category of CATEGORIES) {
      const collected = await seedCategoryType(category, type);
      summary.push(`${category.label}/${type.db}: ${collected}`);
    }
  }

  console.log("\n=== Suplementando categorias abaixo da meta ===");
  for (const supplement of SUPPLEMENTS) {
    const category = CATEGORIES.find(
      (item) => item.value === supplement.categoryValue
    );
    if (!category) continue;

    const current = await countCategoryWorks(supplement.genreName, supplement.type);
    if (current >= category.target) {
      console.log(`= ${supplement.genreName}/${supplement.type}: ${current} (ok)`);
      continue;
    }

    const type = TYPES.find((item) => item.db === supplement.type)!;
    const collected = await fillToTarget(
      category,
      type,
      supplement.filter,
      supplement.genreName,
      category.target,
      current,
      new Set<string>(),
      `${supplement.genreName} tag=${supplement.filter.tag ?? supplement.filter.genre}`
    );
    summary.push(`${supplement.genreName}/${supplement.type} (tag): ${collected}`);
  }

  console.log("\n=== Total por categoria ===");
  for (const line of summary) console.log(line);
  console.log("\nEstatísticas:", JSON.stringify(stats));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());