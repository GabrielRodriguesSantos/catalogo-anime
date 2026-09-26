export const WORK_TYPE_LABELS: Record<string, string> = {
  ANIME: "Anime",
  MANGA: "Mangá",
  MANHWA: "Manhwa",
  MANHUA: "Manhua",
  DONGHUA: "Donghua",
  NOVEL: "Novel",
  OTHER: "Outro",
};

export const WORK_STATUS_LABELS: Record<string, string> = {
  ONGOING: "Em andamento",
  COMPLETED: "Concluído",
  HIATUS: "Em hiato",
  CANCELLED: "Cancelado",
  UNKNOWN: "Desconhecido",
};

export const WORK_AGE_RATINGS = [
  "LIVRE",
  "R10",
  "R12",
  "R14",
  "R16",
  "R18",
] as const;

export type WorkAgeRatingValue = (typeof WORK_AGE_RATINGS)[number];

export const WORK_AGE_RATING_LABELS: Record<string, string> = {
  LIVRE: "Livre",
  R10: "10",
  R12: "12",
  R14: "14",
  R16: "16",
  R18: "18",
};

export const WORK_AGE_RATING_DESCRIPTIONS: Record<string, string> = {
  LIVRE: "Livre para todas as idades.",
  R10: "Não recomendado para menores de 10 anos.",
  R12: "Não recomendado para menores de 12 anos.",
  R14: "Não recomendado para menores de 14 anos.",
  R16: "Não recomendado para menores de 16 anos.",
  R18: "Conteúdo adulto. Visível apenas para contas que confirmam ser maiores de 18 anos.",
};

export const ADULT_RATING = "R18" as const;

export const LIBRARY_SECTIONS = [
  { value: "PLANNED", label: "Quero assistir/ler", statuses: ["PLANNED"] },
  {
    value: "WATCHING_READING",
    label: "Assistindo/Lendo",
    statuses: ["WATCHING", "READING"],
  },
  { value: "COMPLETED", label: "Assistido/Lido", statuses: ["COMPLETED"] },
] as const;

export const LIBRARY_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Quero assistir/ler",
  WATCHING: "Assistindo",
  READING: "Lendo",
  COMPLETED: "Assistido/Lido",
  PAUSED: "Pausado",
  DROPPED: "Abandonado",
  REWATCHING: "Reassistindo",
  REREADING: "Relendo",
};

export const ALL_LIBRARY_STATUSES = [
  "PLANNED",
  "WATCHING",
  "READING",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
  "REWATCHING",
  "REREADING",
] as const;

export type LibraryStatusValue = (typeof ALL_LIBRARY_STATUSES)[number];

export function splitTitles(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export type WorkCardItem = {
  id: string;
  title: string;
  titles: string[];
  type: string;
  coverUrl: string | null;
  synopsis: string | null;
  status: string;
  ageRating: string;
  availability: string | null;
  year: number | null;
  language: string | null;
  platform: string | null;
  genres: { value: string; label: string }[];
  isFavorite: boolean;
  libraryStatus: string | null;
};

export const LANGUAGE_LABELS: Record<string, string> = {
  pt: "Português",
  ja: "Japonês",
  en: "Inglês",
  ko: "Coreano",
  zh: "Chinês",
  fr: "Francês",
  defer: "Outro",
};

export const WORK_LANGUAGE_OPTIONS = [
  { value: "pt", label: "Português" },
  { value: "ja", label: "Japonês" },
  { value: "en", label: "Inglês" },
  { value: "ko", label: "Coreano" },
  { value: "zh", label: "Chinês" },
  { value: "fr", label: "Francês" },
  { value: "other", label: "Outro" },
];

export const WORK_PLATFORM_OPTIONS = [
  "Crunchyroll",
  "Netflix",
  "Max",
  "Prime Video",
  "Disney+",
  "Globoplay",
  "YouTube",
  "TikTok",
  "Twitch",
  "Bilibili",
  "Manga Plus",
  "Amazon Manga",
  "LeYa",
  "Outra",
];

export const PRICE_MODELS = [
  "FREE",
  "ADS",
  "SUBSCRIPTION",
  "VIP",
  "PAID",
  "UNKNOWN",
] as const;
export type PriceModel = (typeof PRICE_MODELS)[number];

export const PRICE_MODEL_LABELS: Record<string, string> = {
  FREE: "Gratuito",
  ADS: "Com anúncios",
  SUBSCRIPTION: "Assinatura",
  VIP: "VIP",
  PAID: "Pago",
  UNKNOWN: "Desconhecido",
};

export const DUBBING_STATUSES = [
  "ACTUAL",
  "ANNOUNCED_FUTURE",
  "NONE",
  "UNKNOWN",
] as const;
export type DubbingStatus = (typeof DUBBING_STATUSES)[number];

export const DUBBING_STATUS_LABELS: Record<string, string> = {
  ACTUAL: "Dublado atualmente",
  ANNOUNCED_FUTURE: "Dublagem anunciada/futura",
  NONE: "Sem dublagem",
  UNKNOWN: "Desconhecido",
};

export const REVIEW_KINDS = [
  "FORUM",
  "VIDEO",
  "COMMENT",
  "REVIEW",
  "COMMUNITY",
  "OTHER",
] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const REVIEW_KIND_LABELS: Record<string, string> = {
  FORUM: "Fórum",
  VIDEO: "Vídeo",
  COMMENT: "Comentário",
  REVIEW: "Crítica/análise",
  COMMUNITY: "Comunidade",
  OTHER: "Outro",
};

export const CONFIDENCE_NOTE =
  "A confiança é uma estimativa a partir da correspondência com o catálogo — nunca uma garantia de precisão.";

export function confidenceHint(confidence: number): string {
  if (confidence >= 0.85) return "Alta";
  if (confidence >= 0.6) return "Média";
  if (confidence >= 0.35) return "Baixa";
  return "Muito baixa";
}