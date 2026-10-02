"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { removeAvatarFile, saveAvatarFile, validateAvatarFile } from "@/lib/avatar";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
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
import { MAX_BIO_LENGTH } from "@/lib/users";
import { setThemeCookies } from "@/app/actions/gate";

export type EditProfileState = {
  error?: string;
};

export async function setAdultVerification(allow: boolean): Promise<{
  ok: boolean;
  enabled: boolean;
  error?: string;
}> {
  const user = await requireUser();
  const enabled = allow === true;

  try {
    await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        adultVerified: enabled,
        adultVerifiedAt: enabled ? new Date() : null,
      },
      update: {
        adultVerified: enabled,
        adultVerifiedAt: enabled ? new Date() : null,
      },
    });

    await logAudit({
      userId: user.id,
      action: enabled ? "ADULT_VERIFICATION_ENABLED" : "ADULT_VERIFICATION_DISABLED",
      entity: "Profile",
      entityId: user.id,
    });

    revalidatePath("/profile");
    revalidatePath("/profile/edit");
    revalidatePath("/obras");
    return { ok: true, enabled };
  } catch (error) {
    console.error("setAdultVerification error", error);
    return {
      ok: false,
      enabled,
      error: "Não foi possível atualizar a preferência. Tente novamente.",
    };
  }
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

export async function updateProfile(
  _prevState: EditProfileState | undefined,
  formData: FormData
): Promise<EditProfileState> {
  const user = await requireUser();

  const bio = String(formData.get("bio") ?? "").trim();
  const theme = String(formData.get("theme") ?? "").trim();
  const accent = String(formData.get("accent") ?? "").trim();
  const banner = String(formData.get("banner") ?? "").trim();
  const removeAvatar = formData.get("removeAvatar") === "on";
  const favoriteCategories = sanitizeCategories(
    formData.getAll("category").map(String)
  );

  if (bio.length > MAX_BIO_LENGTH) {
    return { error: `A biografia deve ter no máximo ${MAX_BIO_LENGTH} caracteres.` };
  }

  const avatar = readAvatarCandidate(formData.get("avatar"));
  if (avatar) {
    const check = await validateAvatarFile(avatar);
    if (!check.ok) return { error: check.error };
  }

  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      profile: { select: { avatarUrl: true } },
    },
  });
  const currentAvatarUrl = current?.profile?.avatarUrl ?? null;

  let avatarUrl = currentAvatarUrl;
  let newAvatarSaved = false;

  if (avatar) {
    try {
      avatarUrl = await saveAvatarFile(avatar);
      newAvatarSaved = true;
    } catch {
      return { error: "Não foi possível salvar a imagem de perfil." };
    }
  } else if (removeAvatar && currentAvatarUrl) {
    avatarUrl = null;
  }

  try {
    const preferences =
      isThemeValue(theme) && isAccentValue(accent)
        ? { theme, accent, favoriteCategories }
        : { ...DEFAULT_PREFERENCES, favoriteCategories };

    await prisma.user.update({
      where: { id: user.id },
      data: {
        profile: {
          upsert: {
            create: {
              bio: bio.length > 0 ? bio : null,
              avatarUrl,
              bannerUrl: banner.length > 0 ? banner : null,
            },
            update: {
              bio: bio.length > 0 ? bio : null,
              avatarUrl,
              bannerUrl: banner.length > 0 ? banner : null,
            },
          },
        },
        settings: {
          upsert: {
            create: { data: serializePreferences(preferences) },
            update: { data: serializePreferences(preferences) },
          },
        },
      },
    });

    await setThemeCookies(
      preferences.theme,
      preferences.accent
    );

    await logAudit({
      userId: user.id,
      action: "PROFILE_UPDATED",
      entity: "User",
      entityId: user.id,
    });
  } catch (error) {
    if (newAvatarSaved && avatarUrl) {
      await removeAvatarFile(avatarUrl).catch(() => undefined);
    }
    console.error("updateProfile error", error);
    return { error: "Não foi possível salvar as alterações. Tente novamente." };
  }

  if (currentAvatarUrl && (avatar || removeAvatar)) {
    await removeAvatarFile(currentAvatarUrl).catch(() => undefined);
  }

  redirect("/profile");
}