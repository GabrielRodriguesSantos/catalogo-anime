"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  findUserLibrary,
  findWorks,
  type LibraryStatusValue,
  type WorkCardItem,
} from "@/lib/catalog";
import { isAdultRating, isAdultViewer } from "@/lib/content-gates";
import { notifyUsersAboutNewWork } from "@/lib/notifications";
import { requireAdmin, requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { GENRES } from "@/lib/preferences";
import {
  WORK_AGE_RATINGS,
  WORK_LANGUAGE_OPTIONS,
  WORK_PLATFORM_OPTIONS,
  dbGenreNamesFromPillValues,
} from "@/lib/catalog-data";

export type WorksPageInput = {
  q?: string;
  type?: string;
  genres?: string[];
  status?: string;
  ageRating?: string;
  favoriteOnly?: boolean;
  skip?: number;
  take?: number;
};

export type WorksResult = {
  items: WorkCardItem[];
  total: number;
  hasMore: boolean;
};

export async function searchWorks(input: WorksPageInput): Promise<WorksResult> {
  const user = await requireUser();
  return findWorks({
    userId: user.id,
    q: input.q,
    type: input.type,
    genres: input.genres,
    status: input.status,
    ageRating: input.ageRating,
    favoriteOnly: input.favoriteOnly,
    skip: input.skip,
    take: input.take,
  });
}

export async function searchLibrary(input: WorksPageInput): Promise<WorksResult> {
  const user = await requireUser();
  return findUserLibrary(user.id, {
    q: input.q,
    type: input.type,
    genres: input.genres,
    status: input.status,
    favoriteOnly: input.favoriteOnly,
    skip: input.skip,
    take: input.take,
  });
}

const DEFAULT_LIBRARY_NAME = "Padrão";

async function getDefaultLibraryId(userId: string): Promise<string> {
  const existing = await prisma.library.findFirst({
    where: { userId, isDefault: true },
    select: { id: true },
  });
  if (existing) return existing.id;

  const scoped = await prisma.library.findFirst({
    where: { userId },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });
  if (scoped) {
    await prisma.library.update({
      where: { id: scoped.id },
      data: { isDefault: true },
    });
    return scoped.id;
  }

  const created = await prisma.library.create({
    data: { userId, name: DEFAULT_LIBRARY_NAME, isDefault: true, sortOrder: 0 },
  });
  return created.id;
}

const VALID_LIBRARY_STATUSES = new Set([
  "PLANNED",
  "WATCHING",
  "READING",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
  "REWATCHING",
  "REREADING",
]);

export async function setLibraryStatus(input: {
  workId: string;
  status: string;
}): Promise<void> {
  const user = await requireUser();
  const workId = (input.workId ?? "").trim();

  if (!workId) return;

  if (input.status === "" || input.status === "NONE") {
    await prisma.libraryItem.deleteMany({
      where: { userId: user.id, workId },
    });
    return;
  }

  if (!VALID_LIBRARY_STATUSES.has(input.status)) return;

  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: { ageRating: true },
  });
  if (!work) return;
  if (
    isAdultRating(work.ageRating) &&
    !(await isAdultViewer(user.id))
  ) {
    return;
  }

  const libraryId = await getDefaultLibraryId(user.id);
  const statusValue = input.status as LibraryStatusValue;

  await prisma.libraryItem.upsert({
    where: {
      libraryId_workId: { libraryId, workId },
    },
    create: {
      userId: user.id,
      libraryId,
      workId,
      status: statusValue,
    },
    update: { status: statusValue },
  });
}

export async function toggleFavorite(input: {
  workId: string;
  favorite: boolean;
}): Promise<void> {
  const user = await requireUser();
  const workId = (input.workId ?? "").trim();
  if (!workId) return;

  if (input.favorite) {
    const work = await prisma.work.findUnique({
      where: { id: workId },
      select: { ageRating: true },
    });
    if (!work) return;
    if (
      isAdultRating(work.ageRating) &&
      !(await isAdultViewer(user.id))
    ) {
      return;
    }
    await prisma.favorite.upsert({
      where: { userId_workId: { userId: user.id, workId } },
      create: { userId: user.id, workId },
      update: {},
    });
  } else {
    await prisma.favorite.deleteMany({ where: { userId: user.id, workId } });
  }
}

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  const text = value === null ? "" : String(value).trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isInteger(parsed) ? parsed : null;
}

export type CreateWorkState = {
  error?: string;
  success?: string;
};

const VALID_WORK_TYPES = new Set([
  "ANIME",
  "MANGA",
  "MANHWA",
  "MANHUA",
  "DONGHUA",
  "NOVEL",
  "OTHER",
]);

const VALID_WORK_STATUSES = new Set([
  "ONGOING",
  "COMPLETED",
  "HIATUS",
  "CANCELLED",
  "UNKNOWN",
]);

const VALID_AGE_RATINGS = new Set<string>(WORK_AGE_RATINGS);

export async function createWork(
  _prevState: CreateWorkState | undefined,
  formData: FormData
): Promise<CreateWorkState> {
  const admin = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const status = String(formData.get("status") ?? "UNKNOWN").trim();
  const ageRating = String(formData.get("ageRating") ?? "LIVRE").trim();
  const titles = String(formData.get("titles") ?? "").trim();
  const synopsis = String(formData.get("synopsis") ?? "").trim();
  const coverUrl = String(formData.get("coverUrl") ?? "").trim();
  const availability = String(formData.get("availability") ?? "").trim();
  const year = parseOptionalInt(formData.get("year"));
  const language = String(formData.get("language") ?? "").trim();
  const platform = String(formData.get("platform") ?? "").trim();
  const genreValues = formData
    .getAll("genre")
    .map(String)
    .filter((value) => GENRES.some((genre) => genre.value === value));

  if (title.length > 200) {
    return { error: "O título deve ter no máximo 200 caracteres." };
  }
  if (!VALID_WORK_TYPES.has(type)) {
    return { error: "Selecione um tipo válido." };
  }
  if (!VALID_WORK_STATUSES.has(status)) {
    return { error: "Selecione um status válido." };
  }
  if (!VALID_AGE_RATINGS.has(ageRating)) {
    return { error: "Selecione uma classificação etária válida." };
  }
  if (year !== null && (year < 1900 || year > 2100)) {
    return { error: "Ano inválido." };
  }
  if (
    language &&
    !WORK_LANGUAGE_OPTIONS.some((option) => option.value === language)
  ) {
    return { error: "Selecione um idioma válido." };
  }
  if (platform && !WORK_PLATFORM_OPTIONS.includes(platform)) {
    return { error: "Selecione uma plataforma válida." };
  }
  const finalGenres: string[] = dbGenreNamesFromPillValues(genreValues);

  let createdId: string | undefined;

  try {
    await prisma.$transaction(async (tx) => {
      const genreRows = await Promise.all(
        finalGenres.map((value) =>
          tx.genre.upsert({
            where: { name: value },
            create: { name: value },
            update: {},
          })
        )
      );

      const work = await tx.work.create({
        data: {
          title,
          type: type as "ANIME" | "MANGA" | "MANHWA" | "MANHUA" | "DONGHUA" | "NOVEL" | "OTHER",
          status: status as "ONGOING" | "COMPLETED" | "HIATUS" | "CANCELLED" | "UNKNOWN",
          ageRating: ageRating as "LIVRE" | "R10" | "R12" | "R14" | "R16" | "R18",
          titles: titles || null,
          synopsis: synopsis || null,
          coverUrl: coverUrl || null,
          availability: availability || null,
          language: language || null,
          platform: platform || null,
          year,
          genres: {
            create: genreRows.map((genre) => ({ genreId: genre.id })),
          },
        },
      });

      createdId = work.id;

      await notifyUsersAboutNewWork({
        workId: work.id,
        workTitle: work.title,
        genreValues: finalGenres,
        ageRating: work.ageRating,
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: "WORK_CREATED",
          entity: "Work",
          entityId: work.id,
          metadata: JSON.stringify({ title, type }),
        },
      });
    });

    revalidatePath("/obras");
  } catch (error) {
    console.error("createWork error", error);
    return { error: "Não foi possível criar a obra. Tente novamente." };
  }

  redirect(`/obras?nova=${createdId ?? ""}`);
}

export type WorkAgeRatingState = {
  ok: boolean;
  error?: string;
};

export async function setWorkAgeRating(
  _prevState: WorkAgeRatingState | null,
  formData: FormData
): Promise<WorkAgeRatingState> {
  const admin = await requireAdmin();

  const id = String(formData.get("workId") ?? "").trim();
  const rating = String(formData.get("ageRating") ?? "").trim();

  if (!id) return { ok: false, error: "Obra inválida." };
  if (!VALID_AGE_RATINGS.has(rating)) {
    return { ok: false, error: "Classificação etária inválida." };
  }

  const work = await prisma.work.findUnique({
    where: { id },
    select: { id: true, title: true, ageRating: true },
  });
  if (!work) return { ok: false, error: "Obra não encontrada." };

  try {
    await prisma.$transaction([
      prisma.work.update({
        where: { id },
        data: { ageRating: rating as "LIVRE" | "R10" | "R12" | "R14" | "R16" | "R18" },
      }),
      prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: "WORK_AGE_RATING_UPDATED",
          entity: "Work",
          entityId: id,
          metadata: JSON.stringify({
            title: work.title,
            from: work.ageRating,
            to: rating,
          }),
        },
      }),
    ]);

    revalidatePath("/obras");
    revalidatePath(`/obras/${id}`);
    revalidatePath("/admin/works");
    return { ok: true };
  } catch (error) {
    console.error("setWorkAgeRating error", error);
    return { ok: false, error: "Não foi possível salvar a classificação." };
  }
}