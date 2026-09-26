import "server-only";

import { prisma } from "@/lib/prisma";
import { ADULT_RATING } from "@/lib/catalog-data";
import { splitTitles } from "@/lib/catalog-data";

const STOPWORDS = new Set([
  "a", "an", "and", "as", "at", "by", "da", "das", "de", "do", "dos", "e",
  "em", "é", "for", "from", "in", "is", "o", "of", "on", "os", "para", "que",
  "sobre", "the", "to", "um", "uma", "with", "uma", "e", "na", "no", "com",
  "essa", "esse", "aquele", "aquela",
]);

const KEEP_RANGES =
  "\\u3040-\\u30ff\\u3400-\\u9fff\\uac00-\\ud7af\\u00c0-\\u00ff0-9a-z";

export function normalizeText(input: string): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(new RegExp(`[^${KEEP_RANGES}\\s]+`, "g"), " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

export function damerau(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
      if (
        i > 1 &&
        j > 1 &&
        a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
      ) {
        // transposition (optimal string alignment)
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - damerau(a, b) / max;
}

type IndexedWork = {
  id: string;
  type: string;
  status: string;
  ageRating: string;
  language: string | null;
  platform: string | null;
  genres: string[];
  title: string;
  titleNorm: string;
  titleTokens: string[];
  altTokens: string[][];
  synopsisTokens: string[];
};

let cache: { at: number; rows: IndexedWork[] } | null = null;

async function getIndex(): Promise<IndexedWork[]> {
  const now = Date.now();
  if (cache && now - cache.at < 10_000) return cache.rows;

  const works = await prisma.work.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      status: true,
      ageRating: true,
      language: true,
      platform: true,
      title: true,
      titles: true,
      synopsis: true,
      genres: { select: { genre: { select: { name: true } } } },
    },
  });

  const rows: IndexedWork[] = works.map((work) => {
    const altTitles = splitTitles(work.titles);
    return {
      id: work.id,
      type: work.type,
      status: work.status,
      ageRating: work.ageRating,
      language: work.language,
      platform: work.platform,
      genres: work.genres.map((genre) => genre.genre.name),
      title: work.title,
      titleNorm: normalizeText(work.title),
      titleTokens: tokenize(work.title),
      altTokens: altTitles.map(tokenize),
      synopsisTokens: tokenize(work.synopsis ?? ""),
    };
  });

  cache = { at: now, rows };
  return rows;
}

export type DiscoveryFilters = {
  type?: string;
  genres?: string[];
  status?: string;
  language?: string;
  platform?: string;
};

export type ScoredResult = {
  work: IndexedWork;
  confidence: number;
  matchedFields: string[];
};

const FIELD_META = [
  { name: "Título", weight: 3.0, tokens: (w: IndexedWork) => [w.titleTokens] },
  {
    name: "Títulos alternativos",
    weight: 1.6,
    tokens: (w: IndexedWork) => w.altTokens,
  },
  {
    name: "Gênero",
    weight: 1.1,
    tokens: (w: IndexedWork) => w.genres.map((g) => tokenize(g)).filter((t) => t.length > 0),
  },
  {
    name: "Descrição",
    weight: 0.65,
    tokens: (w: IndexedWork) => (w.synopsisTokens.length ? [w.synopsisTokens] : []),
  },
  {
    name: "Idioma",
    weight: 0.5,
    tokens: (w: IndexedWork) =>
      w.language && normalizeText(w.language) ? [tokenize(w.language)] : [],
  },
] as const;

function matchesFilters(work: IndexedWork, filters: DiscoveryFilters): boolean {
  if (filters.type && work.type !== filters.type) return false;
  if (filters.status && work.status !== filters.status) return false;
  if (filters.language && work.language !== filters.language) return false;
  if (filters.platform && work.platform !== filters.platform) return false;
  if (filters.genres?.length) {
    const hasAll = filters.genres.every((genre) => work.genres.includes(genre));
    if (!hasAll) return false;
  }
  return true;
}

function scoreWork(
  work: IndexedWork,
  queryTokens: string[]
): { confidence: number; matchedFields: string[] } {
  if (queryTokens.length === 0) {
    return { confidence: 1, matchedFields: ["Sem critérios (filtros)"] };
  }

  const fullQuery = queryTokens.join(" ");
  let totalAchieved = 0;
  let totalPossible = 0;
  const matchedFields: string[] = [];

  if (work.titleNorm === fullQuery) {
    totalAchieved += 5;
  }
  if (work.titleNorm.includes(fullQuery) || fullQuery.includes(work.titleNorm)) {
    totalAchieved += 3;
  }
  totalPossible += 5;

  for (const queryToken of queryTokens) {
    let best = -Infinity;
    let bestField: string | null = null;
    for (const field of FIELD_META) {
      for (const tokenList of field.tokens(work)) {
        for (const token of tokenList) {
          const sim = Math.max(best, similarity(queryToken, token));
          if (sim > best) {
            best = sim;
            bestField = field.name;
          }
        }
      }
    }
    if (best >= 0.82) {
      totalAchieved += FIELD_META.find(
        (field) => field.name === bestField
      )!.weight * best;
      if (!matchedFields.includes(bestField!)) matchedFields.push(bestField!);
    }
    totalPossible += 3;
  }

  const confidence = Math.max(
    0,
    Math.min(1, totalAchieved / Math.max(totalPossible, 1))
  );
  return { confidence, matchedFields };
}

export type RankedResult = ScoredResult & { workId: string };

export async function searchCatalog(input: {
  text: string;
  filters?: DiscoveryFilters;
  skip?: number;
  take?: number;
  minConfidence?: number;
  adult?: boolean;
}): Promise<{ results: RankedResult[]; total: number; hasMore: boolean }> {
  const rows = await getIndex();
  const queryTokens = tokenize(input.text ?? "");
  const filters = input.filters ?? {};
  const skip = Math.max(0, Number(input.skip) || 0);
  const take = Math.min(Math.max(1, Number(input.take) || 20), 100);
  const minConfidence = Number(input.minConfidence) || 0.02;
  const adult = input.adult === true;

  const candidates: RankedResult[] = [];

  for (const work of rows) {
    if (work.ageRating === ADULT_RATING && !adult) continue;
    if (!matchesFilters(work, filters)) continue;
    const { confidence, matchedFields } = scoreWork(work, queryTokens);
    if (confidence >= minConfidence) {
      candidates.push({ work, confidence, matchedFields, workId: work.id });
    }
  }

  candidates.sort(
    (a, b) =>
      b.confidence - a.confidence ||
      b.work.title.localeCompare(a.work.title)
  );

  const total = candidates.length;
  const page = candidates.slice(skip, skip + take);
  return { results: page, total, hasMore: skip + page.length < total };
}