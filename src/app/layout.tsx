import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

import ThemeProvider, { type ThemeValue } from "@/components/theme-provider";
import {
  APP_DESCRIPTION,
  APP_NAME,
  BRAND_ACCENT_HEX,
  SITE_ACCENT_COOKIE,
  SITE_THEME_COOKIE,
} from "@/lib/config";
import { ACCENT_OPTIONS, THEME_OPTIONS } from "@/lib/preferences";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await cookies();
  const storedTheme = store.get(SITE_THEME_COOKIE)?.value as ThemeValue;
  const theme = THEME_OPTIONS.some((option) => option.value === storedTheme)
    ? storedTheme
    : "system";
  const storedAccent = store.get(SITE_ACCENT_COOKIE)?.value;
  const accentHex = ACCENT_OPTIONS.some((option) => option.hex === storedAccent)
    ? storedAccent!
    : BRAND_ACCENT_HEX;

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" type="image/svg+xml" href="/api/brand/logo" />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider theme={theme} accentHex={accentHex}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}