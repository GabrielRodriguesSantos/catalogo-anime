"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { removeAvatarFile, saveAvatarFile, validateAvatarFile } from "@/lib/avatar";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteSession, getSession } from "@/lib/session";
import {
  isRegistrationOpen,
  EMAIL_MAX_LENGTH,
  EMAIL_REGEX,
  MAX_BIO_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  getOngoingUniqueConflict,
  USERNAME_MAX_LENGTH,
  USERNAME_REGEX,
} from "@/lib/users";
import {
  ACCENT_OPTIONS,
  DEFAULT_PREFERENCES,
  FAVORITE_CATEGORIES,
  serializePreferences,
  THEME_OPTIONS,
  type AccentPreference,
  type FavoriteCategoryValue,
  type ThemePreference,
} from "@/lib/preferences";
import { readAvatarCandidate } from "@/lib/upload";
import { setThemeCookies } from "@/app/actions/gate";

export type LoginState = {
  error?: string;
};

export type RegisterState = {
  error?: string;
};

async function requestContext() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  };
}

function isThemeValue(value: string): value is ThemePreference {
  return THEME_OPTIONS.some((option) => option.value === value);
}

function isAccentValue(value: string): value is AccentPreference {
  return ACCENT_OPTIONS.some((option) => option.value === value);
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

export async function login(
  _prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const ctx = await requestContext();

  if (!identifier || !password) {
    return { error: "Informe e-mail (ou usuário) e senha." };
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
    },
  });

  if (!user) {
    await logAudit({
      action: "LOGIN_FAILED",
      entity: "User",
      metadata: { identifier },
      ...ctx,
    });
    return { error: "Credenciais inválidas." };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid || user.status !== "ACTIVE" || user.deletedAt) {
    await logAudit({
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: user.id,
      metadata: { identifier },
      ...ctx,
    });
    return { error: "Credenciais inválidas." };
  }

  await createSession({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  const settingsRow = await prisma.userSetting.findUnique({
    where: { userId: user.id },
    select: { data: true },
  });
  let storedTheme = "system";
  let storedAccent = "red";
  if (settingsRow?.data) {
    try {
      const parsed = JSON.parse(settingsRow.data) as {
        theme?: string;
        accent?: string;
      };
      storedTheme = isThemeValue(parsed.theme ?? "") ? parsed.theme! : "system";
      storedAccent = isAccentValue(parsed.accent ?? "") ? parsed.accent! : "red";
    } catch {
      // keep defaults
    }
  }
  await setThemeCookies(storedTheme, storedAccent);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await prisma.historyEntry.create({
    data: { userId: user.id, action: "LOGIN" },
  });

  await logAudit({
    action: "LOGIN_SUCCESS",
    entity: "User",
    entityId: user.id,
    metadata: { identifier },
    ...ctx,
  });

  redirect("/");
}

export async function register(
  _prevState: RegisterState | undefined,
  formData: FormData
): Promise<RegisterState> {
  const ctx = await requestContext();

  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const bio = String(formData.get("bio") ?? "").trim();
  const theme = String(formData.get("theme") ?? "").trim();
  const accent = String(formData.get("accent") ?? "").trim();
  const favoriteCategories = sanitizeCategories(
    formData.getAll("category").map(String)
  );
  const adultConfirmed = String(formData.get("adult") ?? "").trim() === "yes";

  if (!USERNAME_REGEX.test(username)) {
    return {
      error: `O nome de usuário deve ter entre 3 e ${USERNAME_MAX_LENGTH} caracteres usando letras, números, "_" ou "-".`,
    };
  }

  if (!EMAIL_REGEX.test(email) || email.length > EMAIL_MAX_LENGTH) {
    return { error: "Informe um e-mail válido." };
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return {
      error: `A senha deve ter entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres.`,
    };
  }

  if (password !== confirm) {
    return { error: "As senhas não coincidem." };
  }

  if (!adultConfirmed) {
    return {
      error: "É necessário confirmar que você tem 18 anos ou mais para criar uma conta.",
    };
  }

  if (bio.length > MAX_BIO_LENGTH) {
    return { error: `A biografia deve ter no máximo ${MAX_BIO_LENGTH} caracteres.` };
  }

  const avatar = readAvatarCandidate(formData.get("avatar"));
  if (avatar) {
    const check = await validateAvatarFile(avatar);
    if (!check.ok) return { error: check.error };
  }

  const registrationStatus = await isRegistrationOpen();
  if (!registrationStatus.open) {
    await logAudit({
      action: "REGISTER_BLOCKED",
      entity: "User",
      metadata: { username, email, activeUsers: registrationStatus.activeUsers },
      ...ctx,
    });
    return {
      error: `Limite de ${registrationStatus.maxUsers} usuários atingido.`,
    };
  }

  const conflict = await getOngoingUniqueConflict(username, email);
  if (conflict) {
    return { error: conflict.message };
  }

  let avatarUrl: string | null = null;
  if (avatar) {
    try {
      avatarUrl = await saveAvatarFile(avatar);
    } catch {
      return { error: "Não foi possível salvar a imagem de perfil." };
    }
  }

  const preferences =
    isThemeValue(theme) && isAccentValue(accent)
      ? { theme, accent, favoriteCategories }
      : { ...DEFAULT_PREFERENCES, favoriteCategories };

  let user: { id: string; username: string; role: "USER" | "MODERATOR" | "ADMIN" };

  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username,
          email,
          passwordHash: await hashPassword(password),
          profile: {
            create: {
              bio: bio.length > 0 ? bio : null,
              avatarUrl,
              adultVerified: true,
              adultVerifiedAt: new Date(),
            },
          },
          settings: {
            create: { data: serializePreferences(preferences) },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: created.id,
          action: "REGISTER_SUCCESS",
          entity: "User",
          entityId: created.id,
          metadata: JSON.stringify({ username, email }),
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });

      await tx.library.create({
        data: {
          userId: created.id,
          name: "Padrão",
          isDefault: true,
          sortOrder: 0,
        },
      });

      await tx.historyEntry.create({
        data: {
          userId: created.id,
          action: "REGISTER",
          detail: "Conta criada",
        },
      });

      await tx.notification.create({
        data: {
          userId: created.id,
          type: "WELCOME",
          title: "Bem-vindo(a) ao Catálogo!",
          message:
            "Sua conta foi criada. Você já pode personalizar seu perfil e montar sua biblioteca.",
          link: "/profile",
        },
      });

      return created;
    });
  } catch (error) {
    if (avatarUrl) await removeAvatarFile(avatarUrl).catch(() => undefined);
    console.error("register error", error);
    return { error: "Não foi possível concluir o cadastro. Tente novamente." };
  }

  await createSession({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  await setThemeCookies(theme, accent);

  redirect("/");
}

export async function logout(): Promise<void> {
  const session = await getSession();
  if (session) {
    await prisma.historyEntry.create({
      data: { userId: session.userId, action: "LOGOUT" },
    });
  }
  await deleteSession();
  redirect("/login");
}