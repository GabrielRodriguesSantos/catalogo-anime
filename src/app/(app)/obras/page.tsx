import type { Metadata } from "next";

import CatalogBrowser from "@/components/catalog-browser";
import { isAdultViewer } from "@/lib/content-gates";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Catálogo",
};

export default async function WorksPage() {
  const user = await requireUser();
  const adultVerified = await isAdultViewer(user.id);

  return <CatalogBrowser adultVerified={adultVerified} />;
}