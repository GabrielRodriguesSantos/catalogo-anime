import type { Metadata } from "next";
import Link from "next/link";

import LibraryBrowser from "@/components/library-browser";

export const metadata: Metadata = {
  title: "Minha biblioteca",
};

export default function LibraryPage() {
  return (
    <div>
      <div className="mb-2 max-w-6xl px-4 pt-8 sm:px-6">
        <Link
          href="/profile"
          className="text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          ← Voltar ao perfil
        </Link>
      </div>
      <LibraryBrowser />
    </div>
  );
}