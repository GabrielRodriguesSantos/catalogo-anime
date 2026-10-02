"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/session";
import { getSiteSetting, setSiteSetting, type SiteSettingName } from "@/lib/site-settings";
import { ACCENT_OPTIONS, FAVORITE_CATEGORIES, serializePreferences, type AccentPreference, type FavoriteCategoryValue, type ThemePreference } from "@/lib/preferences";
import {
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_TTL_DAYS,
  SITE_ACCENT_COOKIE,
  SITE_THEME_COOKIE,
} from "@/lib/config";
import { encrypt } from "@/lib/token";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  EMAIL_MAX_LENGTH,
  EMAIL_REGEX,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  USERNAME_REGEX,
} from "@/lib/users";

export async function submitSiteAccess(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  const expected = await getSiteSetting("access_password");

  if (password !== expected) {
    return { error: "Senha de acesso incorreta." };
  }

  const store = await cookies();
  store.set(SITE_ACCESS_COOKIE, "granted", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SITE_ACCESS_TTL_DAYS * 24 * 60 * 60,
  });

  redirect("/");
}

function sanitizeCategories(values: string[]): FavoriteCategoryValue[] {
  const allowed = new Set<string>(FAVORITE_CATEGORIES.map((option) => option.value));
  const seen = new Set<string>();
  const result: FavoriteCategoryValue[] = [];
  for (const value of values) {
    if (allowed.has(value) && !seen.has(value)) {
      seen.add(value);
      result.push(value as FavoriteCategoryValue);
    }
  }
  return result;
}

export async function toggleFavoriteCategory(
  category: string
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Faça login para continuar." };

  const settingsRow = await prisma.userSetting.findUnique({
    where: { userId: session.userId },
    select: { data: true },
  });

  let favorites: FavoriteCategoryValue[] = [];
  if (settingsRow?.data) {
    try {
      const parsed = JSON.parse(settingsRow.data) as { favoriteCategories?: unknown };
      if (Array.isArray(parsed.favoriteCategories)) {
        favorites = sanitizeCategories(parsed.favoriteCategories.map(String));
      }
    } catch {
      // keep empty
    }
  }

  const value = category as FavoriteCategoryValue;
  const next = favorites.includes(value)
    ? favorites.filter((item) => item !== value)
    : [...favorites, value];

  await prisma.userSetting.upsert({
    where: { userId: session.userId },
    update: { data: serializePreferences({ ...parsedPrefs(settingsRow?.data), favoriteCategories: next }) },
    create: {
      userId: session.userId,
      data: serializePreferences({ theme: "system", accent: "red", favoriteCategories: next }),
    },
  });

  revalidatePath("/", "layout");
  return {};
}

function parsedPrefs(raw?: string | null): {
  theme: ThemePreference;
  accent: AccentPreference;
  favoriteCategories: FavoriteCategoryValue[];
} {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as {
        theme?: string;
        accent?: string;
        favoriteCategories?: unknown;
      };
      return {
        theme: parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : "system",
        accent:
          ACCENT_OPTIONS.some((option) => option.value === parsed.accent)
            ? (parsed.accent as AccentPreference)
            : "red",
        favoriteCategories: Array.isArray(parsed.favoriteCategories)
          ? sanitizeCategories(parsed.favoriteCategories.map(String))
          : [],
      };
    } catch {
      // fall through
    }
  }
  return { theme: "system", accent: "red", favoriteCategories: [] };
}

export async function verifyAdultPassword(
  _prevState: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const session = await getSession();
  if (!session) return { error: "Faça login para continuar." };

  const password = String(formData.get("password") ?? "");
  const expected = await getSiteSetting("adult_password");
  if (password !== expected) return { error: "Senha errada. Peça-a ao administrador." };

  await prisma.profile.upsert({
    where: { userId: session.userId },
    update: { adultVerified: true, adultVerifiedAt: new Date() },
    create: { userId: session.userId, adultVerified: true, adultVerifiedAt: new Date() },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function verifyAdminPassword(
  _prevState: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const password = String(formData.get("password") ?? "");
  const expected = await getSiteSetting("admin_password");
  if (password !== expected) return { error: "Senha incorreta." };

  const token = await encrypt({ userId: "admin", username: "admin", role: "ADMIN" });
  const store = await cookies();
  store.set(`${SESSION_COOKIE}-admin`, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveSiteSettings(
  _prevState: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const accessPassword = String(formData.get("accessPassword") ?? "").trim();
  const adultPassword = String(formData.get("adultPassword") ?? "").trim();
  const adminPassword = String(formData.get("adminPassword") ?? "").trim();
  const maxUsers = String(formData.get("maxUsers") ?? "").trim();

  const parsedMax = Number(maxUsers);
  if (!Number.isInteger(parsedMax) || parsedMax < 1 || parsedMax > 50) {
    return { error: "Limite de usuários deve ser um número entre 1 e 50." };
  }
  if (accessPassword.length < 3 || adultPassword.length < 1 || adminPassword.length < 3) {
    return { error: "As senhas devem ter ao menos 3 caracteres (exceto a 18+, que pode ter 1)." };
  }

  const entries: [SiteSettingName, string][] = [
    ["access_password", accessPassword],
    ["adult_password", adultPassword],
    ["admin_password", adminPassword],
    ["max_users", String(parsedMax)],
  ];

  for (const [name, value] of entries) {
    await setSiteSetting(name, value);
  }

  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function adminCreateUser(
  _prevState: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const bio = String(formData.get("bio") ?? "").trim();

  if (!USERNAME_REGEX.test(username)) {
    return { error: "Nome de usuário: 3 a 24 caracteres (letras, números, _ ou -)." };
  }
  if (!EMAIL_REGEX.test(email) || email.length > EMAIL_MAX_LENGTH) {
    return { error: "E-mail inválido." };
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return { error: `A senha deve ter entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres.` };
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { username: true },
  });
  if (existing) return { error: "Nome de usuário ou e-mail já está em uso." };

  const count = await prisma.user.count({ where: { status: "ACTIVE", deletedAt: null } });
  const maxUsers = Number(await getSiteSetting("max_users"));
  if (count >= maxUsers) {
    return { error: `Limite de ${maxUsers} usuários atingido.` };
  }

  const prefs = serializePreferences({ theme: "system", accent: "red", favoriteCategories: [] });

  await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        username,
        email,
        passwordHash: await hashPassword(password),
        profile: { create: { bio: bio.length > 0 ? bio : null } },
        settings: { create: { data: prefs } },
      },
    });
    await tx.library.create({
      data: { userId: created.id, name: "Padrão", isDefault: true, sortOrder: 0 },
    });
    await tx.notification.create({
      data: {
        userId: created.id,
        type: "WELCOME",
        title: "Bem-vindo(a) ao Catálogo!",
        message: "Sua conta foi criada pelo administrador.",
        link: "/profile",
      },
    });
    await tx.auditLog.create({
      data: {
        action: "ADMIN_CREATED_USER",
        entity: "User",
        entityId: created.id,
        metadata: JSON.stringify({ username, email }),
      },
    });
  });

  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function setThemeCookies(theme: string, accent: string): Promise<void> {
  const store = await cookies();
  const themeValue = theme === "light" || theme === "dark" ? theme : "system";
  const accentObj = ACCENT_OPTIONS.find((option) => option.value === accent);
  store.set(SITE_THEME_COOKIE, themeValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
  store.set(SITE_ACCENT_COOKIE, accentObj ? accentObj.hex : ACCENT_OPTIONS[1].hex, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}