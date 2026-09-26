export const THEME_OPTIONS = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
] as const;

export type ThemePreference = (typeof THEME_OPTIONS)[number]["value"];

export const ACCENT_OPTIONS = [
  { value: "zinc", label: "Zinco", hex: "#71717a" },
  { value: "red", label: "Vermelho", hex: "#ef4444" },
  { value: "orange", label: "Laranja", hex: "#f97316" },
  { value: "amber", label: "Âmbar", hex: "#f59e0b" },
  { value: "green", label: "Verde", hex: "#22c55e" },
  { value: "emerald", label: "Esmeralda", hex: "#10b981" },
  { value: "teal", label: "Turquesa", hex: "#14b8a6" },
  { value: "cyan", label: "Ciano", hex: "#06b6d4" },
  { value: "blue", label: "Azul", hex: "#3b82f6" },
  { value: "indigo", label: "Índigo", hex: "#6366f1" },
  { value: "violet", label: "Violeta", hex: "#8b5cf6" },
  { value: "purple", label: "Roxo", hex: "#a855f7" },
  { value: "pink", label: "Rosa", hex: "#ec4899" },
  { value: "rose", label: "Rosê", hex: "#f43f5e" },
] as const;

export type AccentPreference = (typeof ACCENT_OPTIONS)[number]["value"];

export const FAVORITE_CATEGORIES = [
  { value: "horror", label: "Horror" },
  { value: "romance", label: "Romance" },
  { value: "acao", label: "Ação" },
  { value: "fantasia", label: "Fantasia" },
  { value: "comedia", label: "Comédia" },
  { value: "drama", label: "Drama" },
  { value: "aventura", label: "Aventura" },
  { value: "misterio", label: "Mistério" },
  { value: "suspense", label: "Suspense" },
  { value: "scifi", label: "Ficção científica" },
  { value: "isekai", label: "Isekai" },
  { value: "escolar", label: "Escolar" },
  { value: "esporte", label: "Esportes" },
  { value: "historico", label: "Histórico" },
  { value: "outros", label: "Outros" },
] as const;

export type FavoriteCategoryValue =
  (typeof FAVORITE_CATEGORIES)[number]["value"];

export const GENRES = FAVORITE_CATEGORIES;

export function genreLabel(value: string): string {
  return FAVORITE_CATEGORIES.find((option) => option.value === value)?.label ?? value;
}

export type UserPreferences = {
  theme: ThemePreference;
  accent: AccentPreference;
  favoriteCategories: FavoriteCategoryValue[];
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  accent: "zinc",
  favoriteCategories: [],
};

function isTheme(value: unknown): value is ThemePreference {
  return THEME_OPTIONS.some((option) => option.value === value);
}

function isAccent(value: unknown): value is AccentPreference {
  return ACCENT_OPTIONS.some((option) => option.value === value);
}

function isFavoriteCategory(value: unknown): value is FavoriteCategoryValue {
  return FAVORITE_CATEGORIES.some((option) => option.value === value);
}

export function parsePreferences(raw?: string | null): UserPreferences {
  if (!raw) return DEFAULT_PREFERENCES;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_PREFERENCES;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return DEFAULT_PREFERENCES;
  }

  const object = parsed as Record<string, unknown>;

  return {
    theme: isTheme(object.theme) ? object.theme : DEFAULT_PREFERENCES.theme,
    accent: isAccent(object.accent) ? object.accent : DEFAULT_PREFERENCES.accent,
    favoriteCategories: Array.isArray(object.favoriteCategories)
      ? object.favoriteCategories.filter(isFavoriteCategory)
      : [],
  };
}

export function serializePreferences(preferences: UserPreferences): string {
  return JSON.stringify(preferences);
}