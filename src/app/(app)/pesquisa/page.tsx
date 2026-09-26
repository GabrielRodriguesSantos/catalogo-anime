import type { Metadata } from "next";

import SearchHub from "@/components/search-hub";

export const metadata: Metadata = {
  title: "Pesquisa",
};

export default async function PesquisaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <SearchHub initialQuery={q ?? ""} />;
}