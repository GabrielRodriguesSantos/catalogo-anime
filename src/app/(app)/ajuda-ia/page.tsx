import type { Metadata } from "next";

import AjudaIA from "@/components/ajuda-ia";

export const metadata: Metadata = {
  title: "AjudaIA",
};

export default function AjudaIAPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          🤖 AjudaIA
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Descreva a obra que você procura — a IA busca no catálogo do site e,
          se estiver habilitada, também na internet. Nada é inventado.
        </p>
      </div>
      <AjudaIA />
    </div>
  );
}