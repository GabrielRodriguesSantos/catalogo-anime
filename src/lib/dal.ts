import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId, status: "ACTIVE", deletedAt: null },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return user;
});

export const getProfileData = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      profile: {
        select: { avatarUrl: true, bio: true, bannerUrl: true, adultVerified: true },
      },
      settings: {
        select: { data: true },
      },
    },
  });
});

export const getProfileLibrary = cache(async (userId: string) => {
  return prisma.library.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      isDefault: true,
      _count: { select: { items: true } },
    },
  });
});

export const getProfileHistory = cache(async (userId: string) => {
  return prisma.historyEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      detail: true,
      createdAt: true,
    },
  });
});

export const getProfileNotifications = cache(
  async (userId: string, options?: { archived?: boolean }) => {
    const archived =
      options?.archived === true ? { not: null } : { equals: null };
    return prisma.notification.findMany({
      where: { userId, archivedAt: archived },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        priority: true,
        readAt: true,
        archivedAt: true,
        createdAt: true,
      },
    });
  }
);

export const getUnreadNotificationCount = cache(async (userId: string) => {
  return prisma.notification.count({
    where: { userId, readAt: null, archivedAt: null },
  });
});

export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

export const requireAdmin = cache(async () => {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
});