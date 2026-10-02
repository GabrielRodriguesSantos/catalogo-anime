import type { Metadata } from "next";

import CatalogBrowser from "@/components/catalog-browser";
import { findWorks } from "@/lib/catalog";
import { isAdultViewer } from "@/lib/content-gates";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { parsePreferences } from "@/lib/preferences";

export const metadata: Metadata = {
  title: "Catálogo",
};

export default async function WorksPage() {
  const user = await requireUser();
  const adultVerified = await isAdultViewer(user.id);

  const settingsRow = await prisma.userSetting.findUnique({
    where: { userId: user.id },
    select: { data: true },
  });
  const favoriteCategories = parsePreferences(settingsRow?.data).favoriteCategories;

  const [pageA, pageB, pageC] = await Promise.all([
    findWorks({ userId: user.id, take: 100, skip: 0 }),
    findWorks({ userId: user.id, take: 100, skip: 100 }),
    findWorks({ userId: user.id, take: 100, skip: 200 }),
  ]);
  const works = [...pageA.items, ...pageB.items, ...pageC.items];

  return (
    <CatalogBrowser
      works={works}
      adultVerified={adultVerified}
      favoriteCategories={favoriteCategories}
    />
  );
}