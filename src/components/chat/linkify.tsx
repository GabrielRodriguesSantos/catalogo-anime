"use client";

import type { ReactNode } from "react";

export function autoLinkify(text: string): ReactNode {
  const parts = text.split(/(https?:\/\/\S+)/gi);
  return parts.map((part, index) => {
    if (/^https?:\/\/\S+$/i.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="text-sky-600 underline dark:text-sky-400"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}