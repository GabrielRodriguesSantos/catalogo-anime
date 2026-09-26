import type { ReactNode } from "react";

import { APP_NAME } from "@/lib/config";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        {APP_NAME}
      </h1>
      {children}
    </main>
  );
}