"use server";

import { redirect } from "next/navigation";

import { removeAvatarFile } from "@/lib/avatar";
import { requireAdmin } from "@/lib/dal";
import { softDeleteUser } from "@/lib/users";

export async function adminDeleteUser(formData: FormData): Promise<void> {
  const actor = await requireAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId || userId === actor.id) return;

  const deleted = await softDeleteUser(actor.id, userId);
  if (deleted?.avatarUrl) {
    await removeAvatarFile(deleted.avatarUrl).catch(() => undefined);
  }

  redirect("/profile");
}