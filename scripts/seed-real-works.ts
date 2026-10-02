import { promises as fs } from "node:fs";
import path from "node:path";

import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function resolveDatabasePath(url: string | undefined): string {
  const fallback = "./prisma/dev.db";
  if (!url) return fallback;
  const value = url.trim();
  if (value === ":memory:") return value;
  return value.startsWith("file:") ? value.slice("file:".length) : value;
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: resolveDatabasePath(process.env.DATABASE_URL),
    }),
    log: ["error"],
  });
}

const prisma = createPrismaClient();

type Entry = {
  title: string;
  type: "ANIME" | "MANGA" | "MANHWA";
  age?: "R12" | "R14" | "R16" | "R18";
};

const ENTRIES: Entry[] = [
  { title: "One Piece", type: "ANIME", age: "R12" },
  { title: "Naruto Shippuden", type: "ANIME", age: "R12" },
  { title: "Dragon Ball Super", type: "ANIME", age: "R12" },
  { title: "Jujutsu Kaisen", type: "ANIME", age: "R16" },
  { title: "Demon Slayer: Kimetsu no Yaiba", type: "ANIME", age: "R14" },
  { title: "Attack on Titan", type: "ANIME", age: "R16" },
  { title: "Fullmetal Alchemist: Brotherhood", type: "ANIME", age: "R14" },
  { title: "Death Note", type: "ANIME", age: "R14" },
  { title: "Bleach", type: "ANIME", age: "R12" },
  { title: "My Hero Academia", type: "ANIME", age: "R12" },
  { title: "One Punch Man", type: "ANIME", age: "R16" },
  { title: "Spy x Family", type: "ANIME", age: "R12" },
  { title: "Chainsaw Man", type: "ANIME", age: "R16" },
  { title: "Hunter x Hunter", type: "ANIME", age: "R12" },
  { title: "Frieren: Beyond Journey's End", type: "ANIME", age: "R12" },
  { title: "Steins;Gate", type: "ANIME", age: "R14" },
  { title: "Code Geass: Lelouch of the Rebellion", type: "ANIME", age: "R14" },
  { title: "Vinland Saga", type: "ANIME", age: "R16" },
  { title: "Cowboy Bebop", type: "ANIME", age: "R14" },
  { title: "Monster", type: "ANIME", age: "R16" },
  { title: "Mob Psycho 100", type: "ANIME", age: "R14" },
  { title: "Tengen Toppa Gurren Lagann", type: "ANIME", age: "R16" },
  { title: "High School DxD", type: "ANIME", age: "R18" },
  { title: "Redo of Healer", type: "ANIME", age: "R18" },
  { title: "Interspecies Reviewers", type: "ANIME", age: "R18" },
  { title: "Elfen Lied", type: "ANIME", age: "R18" },
  { title: "Berserk", type: "ANIME", age: "R18" },
  { title: "One Piece", type: "MANGA", age: "R12" },
  { title: "Jujutsu Kaisen", type: "MANGA", age: "R16" },
  { title: "Berserk", type: "MANGA", age: "R18" },
  { title: "Solo Leveling", type: "MANHWA", age: "R16" },
];

const ANILIST_MEDIA_TYPE: Record<string, string> = {
  ANIME: "ANIME",
  MANGA: "MANGA",
  MANHWA: "MANGA",
};

const ANILIST_STATUS: Record<string, string> = {
  RELEASING: "ONGOING",
  FINISHED: "COMPLETED",
  HIATUS: "HIATUS",
  CANCELLED: "CANCELLED",
  NOT_YET_RELEASED: "UNKNOWN",
};

const QUERY = `
query ($search: String, $type: MediaType) {
  Media(search: $search, type: $type) {
    id
    title { romaji english }
    coverImage { extraLarge large }
    description(asHtml: false)
    status
    startDate { year }
    isAdult
    genres
  }
}
`;

async function anilistSearch(
  search: string,
  type: string
): Promise<Record<string, unknown> | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "catalogo-anime/0.1 (site em construcao entre amigos)",
        },
        body: JSON.stringify({
          query: QUERY,
          variables: { search, type: ANILIST_MEDIA_TYPE[type] },
        }),
        signal: controller.signal,
      });
      if (response.status === 429 || !response.ok) {
        await new Promise((resolve) => setTimeout(resolve, 4000 * (attempt + 1)));
        continue;
      }
      const json = (await response.json()) as {
        data?: { Media?: Record<string, unknown> };
      };
      if (json.data?.Media) return json.data.Media;
      return null;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 4000 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extFromUrl(url: string): string {
  const match = /\.(jpe?g|png|webp)(?:$|\?)/i.exec(url);
  return match ? (match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase()) : "jpg";
}

function cleanSynopsis(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let text = raw.replace(/\*\*/g, "").replace(/^~!|!~$/g, "");
  text = text.replace(/[\r\n]+/g, " ").replace(/[ \t]+/g, " ").trim();
  if (text.length > 620) text = `${text.slice(0, 617).trimEnd()}...`;
  return text || null;
}

async function downloadCover(
  url: string,
  slug: string
): Promise<string | null> {
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = extFromUrl(url);
    const dir = path.join(process.cwd(), "public", "uploads", "discovery");
    await fs.mkdir(dir, { recursive: true });
    const filename = `${slug}.${ext}`;
    await fs.writeFile(path.join(dir, filename), buffer);
    return `/uploads/discovery/${filename}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureGenre(name: string): Promise<string> {
  const row = await prisma.genre.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return row.id;
}

async function seedEntry(entry: Entry): Promise<void> {
  const media = await anilistSearch(entry.title, entry.type);
  if (!media) {
    console.log(`↷ sem retorno AniList: ${entry.title} (${entry.type}) — mantém como está`);
    return;
  }

  const titles = media.title as { romaji?: string; english?: string };
  const title = titles.romaji || entry.title;
  const altNames = [titles.english, entry.title]
    .filter((name) => name && name !== title)
    .join(",");

  const cover = (media.coverImage as { extraLarge?: string; large?: string }) ?? {};
  const coverUrl = await downloadCover(
    cover.extraLarge ?? cover.large ?? "",
    slugify(`${title} ${entry.type.toLowerCase()}`)
  );

  const statusRaw = (media.status as string) ?? "";
  const status =
    (ANILIST_STATUS[statusRaw] as
      | "ONGOING"
      | "COMPLETED"
      | "HIATUS"
      | "CANCELLED"
      | "UNKNOWN") ?? "UNKNOWN";
  const year = ((media.startDate as { year?: number }) ?? {}).year ?? null;
  const isAdult = media.isAdult === true;
  const ageRating = (isAdult
    ? "R18"
    : entry.age ?? "R12") as "R12" | "R14" | "R16" | "R18";
  const genres = (media.genres as string[]) ?? [];

  const type = entry.type as "ANIME" | "MANGA" | "MANHWA";
  const existing = await prisma.work.findFirst({
    where: { title, type },
  });
  let work: { id: string };
  if (existing) {
    work = await prisma.work.update({
      where: { id: existing.id },
      data: {
        synopsis: cleanSynopsis(media.description as string),
        coverUrl,
        status,
        year,
        ageRating,
      },
    });
  } else {
    work = await prisma.work.create({
      data: {
        type,
        title,
        titles: altNames || null,
        synopsis: cleanSynopsis(media.description as string),
        coverUrl,
        status,
        year,
        ageRating,
        language: "ja",
        platform: type === "ANIME" ? "Crunchyroll" : "Amazon Manga",
      },
    });
  }

  await prisma.workGenre.deleteMany({ where: { workId: work.id } });
  for (const name of genres) {
    const genreId = await ensureGenre(name);
    await prisma.workGenre.create({
      data: { workId: work.id, genreId },
    });
  }

  await prisma.workExternalLink.deleteMany({ where: { workId: work.id } });
  const q = encodeURIComponent(title);
  if (type === "ANIME") {
    await prisma.workExternalLink.create({
      data: {
        workId: work.id,
        platform: "Crunchyroll",
        label: "Busca oficial",
        url: `https://www.crunchyroll.com/search?q=${q}`,
        country: "Brasil",
        flag: "🇧🇷",
        language: "pt",
        priceModel: "SUBSCRIPTION",
        dubbingStatus: "UNKNOWN",
        subtitleAvailable: true,
        verified: false,
        note: "Link de busca oficial — confirme a disponibilidade ao abrir.",
      },
    });
    await prisma.workExternalLink.create({
      data: {
        workId: work.id,
        platform: "Netflix",
        label: "Busca oficial",
        url: `https://www.netflix.com/search?q=${q}`,
        country: "Brasil",
        flag: "🇧🇷",
        language: "pt",
        priceModel: "SUBSCRIPTION",
        dubbingStatus: "UNKNOWN",
        subtitleAvailable: true,
        verified: false,
        note: "Link de busca oficial — confirme a disponibilidade ao abrir.",
      },
    });
  } else {
    const amazonQ = encodeURIComponent(`${title} ${type === "MANHWA" ? "manhwa" : "manga"}`);
    await prisma.workExternalLink.create({
      data: {
        workId: work.id,
        platform: "Amazon Manga",
        label: "Busca oficial",
        url: `https://www.amazon.com.br/s?k=${amazonQ}`,
        country: "Brasil",
        flag: "🇧🇷",
        language: "pt",
        priceModel: "PAID",
        dubbingStatus: "UNKNOWN",
        subtitleAvailable: false,
        verified: false,
        note: "Link de busca oficial — confirme a disponibilidade ao abrir.",
      },
    });
  }

  console.log(
    `✓ ${title} · ${type} · ${ageRating} · ${year ?? "?"} · capa: ${coverUrl ?? "sem capa"}`
  );
}

async function mergeGenresToCanonical(): Promise<void> {
  const PILL_TO_DB: Record<string, string[]> = {
    horror: ["Horror"],
    romance: ["Romance"],
    acao: ["Action"],
    fantasia: ["Fantasy"],
    comedia: ["Comedy"],
    drama: ["Drama"],
    aventura: ["Adventure"],
    misterio: ["Mystery"],
    suspense: ["Suspense", "Thriller"],
    scifi: ["Sci-Fi", "Science Fiction"],
    isekai: ["Isekai"],
    escolar: ["School"],
    esporte: ["Sports"],
    historico: ["Historical"],
    outros: [],
  };

  let merged = 0;
  for (const [sourceName, targetNames] of Object.entries(PILL_TO_DB)) {
    if (targetNames.length === 0) continue;
    const source = await prisma.genre.findUnique({
      where: { name: sourceName },
    });
    if (!source) continue;
    for (const targetName of targetNames) {
      const target = await prisma.genre.upsert({
        where: { name: targetName },
        update: {},
        create: { name: targetName },
      });
      const links = await prisma.workGenre.findMany({
        where: { genreId: source.id },
        select: { workId: true },
      });
      for (const link of links) {
        await prisma.workGenre.upsert({
          where: {
            workId_genreId: { workId: link.workId, genreId: target.id },
          },
          update: {},
          create: { workId: link.workId, genreId: target.id },
        });
        merged++;
      }
    }
    await prisma.workGenre.deleteMany({ where: { genreId: source.id } });
    await prisma.genre.delete({ where: { id: source.id } }).catch(() => {});
  }
  console.log(`Gêneros migrados/cruzados: ${merged} vínculos`);
}

async function main() {
  console.log("Migrando gêneros legados para os nomes canônicos...");
  await mergeGenresToCanonical();

  console.log("Removendo obras de teste do catálogo...");
  const removed = await prisma.work.deleteMany({
    where: { title: { contains: "Teste" } },
  });
  console.log(`Obras de teste removidas: ${removed.count}`);

  const done: string[] = [];
  for (const entry of ENTRIES) {
    try {
      await seedEntry(entry);
      done.push(entry.title);
    } catch (error) {
      console.error(`✗ falha ao cadastrar ${entry.title}:`, error);
    }
    await sleep(3000);
  }
  console.log(`Finalizado: ${done.length}/${ENTRIES.length} entradas processadas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());