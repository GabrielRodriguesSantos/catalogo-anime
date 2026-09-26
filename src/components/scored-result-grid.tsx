"use client";

import type { ScoredCard } from "@/app/actions/search";
import {
  CONFIDENCE_NOTE,
  WORK_TYPE_LABELS,
  confidenceHint,
} from "@/lib/catalog-data";
import WorkCard from "@/components/work-card";

function confidenceColor(confidence: number): string {
  if (confidence >= 0.85) return "bg-emerald-500";
  if (confidence >= 0.6) return "bg-amber-500";
  if (confidence >= 0.35) return "bg-orange-400";
  return "bg-zinc-400";
}

export default function ScoredResultGrid({
  cards,
}: {
  cards: ScoredCard[];
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.id}
            className="flex flex-col gap-2 rounded-2xl border border-black/[.08] p-3 dark:border-white/[.145]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Possível correspondência
              </span>
              <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                {confidenceHint(card.confidence)} ·{" "}
                {Math.round(card.confidence * 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full ${confidenceColor(card.confidence)}`}
                style={{ width: `${Math.round(card.confidence * 100)}%` }}
              />
            </div>
            {card.matchedFields.length > 0 && (
              <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                Correspondência: {card.matchedFields.join(", ")}
              </p>
            )}
            <span className="text-xs text-zinc-400">
              {WORK_TYPE_LABELS[card.type] ?? card.type}
            </span>
            <WorkCard work={card} />
          </article>
        ))}
      </div>
      {cards.length > 0 && (
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          {CONFIDENCE_NOTE}
        </p>
      )}
    </div>
  );
}