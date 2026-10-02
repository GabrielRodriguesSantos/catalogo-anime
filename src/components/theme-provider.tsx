"use client";

import { useEffect, type ReactNode } from "react";

export type ThemeValue = "system" | "light" | "dark";

function darken(hex: string, factor = 0.82): string {
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((char) => char + char)
          .join("")
      : cleaned;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) return hex;

  const num = parseInt(full, 16);
  const r = Math.round(((num >> 16) & 255) * factor);
  const g = Math.round(((num >> 8) & 255) * factor);
  const b = Math.round((num & 255) * factor);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveTheme(theme: ThemeValue): "dark" | "light" {
  return theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
}

export default function ThemeProvider({
  theme,
  accentHex,
  children,
}: {
  theme: ThemeValue;
  accentHex: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const apply = () => {
      document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark");
    };
    apply();
    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent-hex", accentHex);
    root.style.setProperty("--accent-hex-dark", darken(accentHex));
  }, [accentHex]);

  return <>{children}</>;
}