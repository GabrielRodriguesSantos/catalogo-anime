import "server-only";

import { prisma } from "@/lib/prisma";
import { MAX_USERS, SITE_SETTINGS_PREFIX } from "@/lib/config";

export type SiteSettingName =
  | "access_password"
  | "adult_password"
  | "admin_password"
  | "max_users";

const DEFAULT_VALUES: Record<SiteSettingName, string> = {
  access_password: "anime01",
  adult_password: "18",
  admin_password: "2501",
  max_users: String(MAX_USERS),
};

export function settingKey(name: SiteSettingName): string {
  return `${SITE_SETTINGS_PREFIX}${name}`;
}

export async function getSiteSetting(
  name: SiteSettingName
): Promise<string> {
  const key = settingKey(name);
  const row = await prisma.appSetting.findUnique({
    where: { key },
    select: { value: true },
  });
  return row?.value ?? DEFAULT_VALUES[name];
}

export async function setSiteSetting(
  name: SiteSettingName,
  value: string
): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: settingKey(name) },
    update: { value },
    create: { key: settingKey(name), value, isPublic: false },
  });
}

export async function getSiteSettings(): Promise<Record<SiteSettingName, string>> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { startsWith: SITE_SETTINGS_PREFIX } },
    select: { key: true, value: true },
  });
  const result = { ...DEFAULT_VALUES };
  for (const row of rows) {
    const name = row.key.slice(SITE_SETTINGS_PREFIX.length) as SiteSettingName;
    if (name in result) result[name] = row.value;
  }
  return result;
}