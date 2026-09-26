import "server-only";

import { prisma } from "@/lib/prisma";
import { parsePreferences } from "@/lib/preferences";
import { isAdultRating } from "@/lib/content-gates";

export async function notifyUsersAboutNewWork(input: {
  workId: string;
  workTitle: string;
  genreValues: string[];
  ageRating: string;
}): Promise<{ notified: number; prioritized: number }> {
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: {
      id: true,
      settings: { select: { data: true } },
      profile: { select: { adultVerified: true } },
    },
  });

  const adultOnly = isAdultRating(input.ageRating);
  const allowed = adultOnly
    ? users.filter((user) => user.profile?.adultVerified === true)
    : users;

  if (allowed.length === 0) return { notified: 0, prioritized: 0 };

  const rows = allowed.map((user) => {
    const favorites = new Set(
      parsePreferences(user.settings?.data).favoriteCategories
    );
    const prioritized = input.genreValues.some((genre) =>
      (favorites as Set<string>).has(genre)
    );

    return {
      userId: user.id,
      type: "NEW_WORK",
      title: `Nova obra: ${input.workTitle}`,
      message: prioritized
        ? "Uma obra nova foi adicionada em uma das suas categorias favoritas."
        : "Uma obra nova foi adicionada ao catálogo.",
      link: `/obras`,
      priority: prioritized ? 1 : 0,
    };
  });

  await prisma.notification.createMany({ data: rows });

  return {
    notified: rows.length,
    prioritized: rows.filter((row) => row.priority === 1).length,
  };
}