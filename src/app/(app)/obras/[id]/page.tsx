import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import WorkCard from "@/components/work-card";
import { findWorkDecoratedById } from "@/lib/catalog";
import {
  DUBBING_STATUS_LABELS,
  LANGUAGE_LABELS,
  PRICE_MODEL_LABELS,
  REVIEW_KIND_LABELS,
} from "@/lib/catalog-data";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Obra",
};

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [work, links, reviews] = await Promise.all([
    findWorkDecoratedById(id, user.id),
    prisma.workExternalLink.findMany({
      where: { workId: id },
      orderBy: [{ verified: "desc" }, { createdAt: "asc" }],
    }),
    prisma.workReview.findMany({
      where: { workId: id },
      orderBy: { fetchedAt: "desc" },
    }),
  ]);

  if (!work) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/obras"
        className="text-sm text-zinc-500 underline dark:text-zinc-400"
      >
        ← Voltar ao catálogo
      </Link>

      <div className="mt-4 max-w-sm">
        <WorkCard work={work} />
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight">
          📍 Onde encontrar
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Este site não hospeda anime, mangá ou manhwa — apenas indica onde a
          obra está disponível. Links externos devem ser verificados.
        </p>

        {links.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-black/[.08] p-4 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
            Nenhuma plataforma registrada para esta obra ainda. Não inventamos
            disponibilidade: assim que houver fontes verificáveis, elas
            aparecem aqui.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {links.map((link) => (
              <li
                key={link.id}
                className="rounded-2xl border border-black/[.08] p-4 dark:border-white/[.145]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {link.label ? `${link.label} · ` : ""}
                      {link.platform}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {link.country && (
                        <span>
                          {link.flag ? `${link.flag} ` : "🌐 "}
                          {link.country}
                          {link.language ? ` · ${LANGUAGE_LABELS[link.language] ?? link.language}` : ""}
                          {link.region ? ` · ${link.region}` : ""}
                        </span>
                      )}
                      {!link.country && link.language && (
                        <span>{LANGUAGE_LABELS[link.language] ?? link.language}</span>
                      )}
                    </p>
                  </div>
                  {link.verified ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Verificado
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      Não verificado
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  {link.priceModel && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                      {PRICE_MODEL_LABELS[link.priceModel] ?? link.priceModel}
                    </span>
                  )}
                  {link.dubbingStatus &&
                    link.dubbingStatus !== "UNKNOWN" && (
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          link.dubbingStatus === "ACTUAL"
                            ? "bg-emerald-100 font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-100 font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                      >
                        {DUBBING_STATUS_LABELS[link.dubbingStatus]}
                        {link.dubbingStatus === "ANNOUNCED_FUTURE" &&
                          " (não disponível ainda)"}
                      </span>
                    )}
                  {link.subtitleAvailable && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                      Com legenda
                    </span>
                  )}
                </div>

                {link.note && (
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {link.note}
                  </p>
                )}

                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block rounded-full border border-black/[.08] px-3 py-1.5 text-sm underline decoration-zinc-300 underline-offset-2 hover:bg-black/[.04] dark:border-white/[.145] dark:decoration-zinc-700 dark:hover:bg-white/[.06]"
                >
                  Abrir página externa ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          💬 Críticas e opiniões
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Opiniões de terceiros publicadas na internet. Não inventamos avaliações
          — cada item indica a fonte.
        </p>

        {reviews.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-black/[.08] p-4 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
            Nenhuma crítica registrada para esta obra ainda. Nenhuma opinião foi
            fabricada — itens reais (fóruns, vídeos, análises) aparecerão aqui
            quando disponíveis ou cadastrados.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-2xl border border-black/[.08] p-4 dark:border-white/[.145]"
              >
                <p className="font-medium">{review.title}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {REVIEW_KIND_LABELS[review.kind] ?? review.kind}
                  {review.author ? ` · ${review.author}` : ""} · fonte:{" "}
                  {review.source}
                </p>
                {review.snippet && (
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    “{review.snippet}”
                  </p>
                )}
                {review.url && (
                  <a
                    href={review.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm underline decoration-zinc-300 underline-offset-2 hover:text-foreground dark:decoration-zinc-700"
                  >
                    Ver na fonte ↗
                  </a>
                )}
                <p className="mt-2 text-xs text-zinc-400">
                  Opinião de terceiros — não representa o catálogo.
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}