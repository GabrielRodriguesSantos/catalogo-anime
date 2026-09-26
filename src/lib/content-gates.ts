import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { ADULT_RATING } from "@/lib/catalog-data";

export const isAdultRating = (
  ageRating: string | null | undefined
): boolean => ageRating === ADULT_RATING;

export const isAdultViewer = cache(async (userId: string): Promise<boolean> => {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { adultVerified: true },
  });
  return Boolean(profile?.adultVerified);
});