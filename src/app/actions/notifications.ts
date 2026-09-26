"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export async function markNotificationRead(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { readAt: new Date() },
  });

  revalidatePath("/profile/notifications");
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/profile/notifications");
}

export async function archiveNotification(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { archivedAt: new Date(), readAt: new Date() },
  });

  revalidatePath("/profile/notifications");
}

export async function deleteNotification(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await prisma.notification.deleteMany({ where: { id, userId: user.id } });

  revalidatePath("/profile/notifications");
}