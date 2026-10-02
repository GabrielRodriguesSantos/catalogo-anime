import "server-only";

import { MAX_USERS } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { getSiteSetting } from "@/lib/site-settings";

export const USERNAME_REGEX = /^[A-Za-z0-9_-]{3,24}$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX_LENGTH = 254;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;
export const MAX_BIO_LENGTH = 500;

export async function countActiveUsers(): Promise<number> {
  return prisma.user.count({
    where: { status: "ACTIVE", deletedAt: null },
  });
}

export async function isRegistrationOpen(): Promise<{
  open: boolean;
  activeUsers: number;
  maxUsers: number;
}> {
  const [activeUsers, maxUsers] = await Promise.all([
    countActiveUsers(),
    getSiteSetting("max_users").then((value) => {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 1 ? parsed : MAX_USERS;
    }),
  ]);
  return { open: activeUsers < maxUsers, activeUsers, maxUsers };
}

export async function getOngoingUniqueConflict(username: string, email: string) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email: email.toLowerCase() }],
    },
    select: { id: true, username: true, email: true },
  });

  if (!existing) return null;

  if (existing.username === username) {
    return { field: "username" as const, message: "Este nome de usuário já está em uso." };
  }
  return { field: "email" as const, message: "Este e-mail já está cadastrado." };
}

export async function softDeleteUser(
  actorId: string,
  userId: string
): Promise<{ id: string; username: string; avatarUrl?: string | null } | null> {
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        status: true,
        deletedAt: true,
        profile: { select: { avatarUrl: true } },
      },
    });

    if (!target || target.status === "INACTIVE" || target.deletedAt) return null;

    await tx.user.update({
      where: { id: userId },
      data: { status: "INACTIVE", deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "USER_DELETED",
        entity: "User",
        entityId: userId,
        metadata: JSON.stringify({ username: target.username }),
      },
    });

    return { id: target.id, username: target.username, avatarUrl: target.profile?.avatarUrl };
  });
}