import type { ReactNode } from "react";

import { APP_NAME } from "@/lib/config";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <img src="/api/brand/logo" alt="" className="h-16 w-16 rounded-2xl" />
        <h1 className="text-2xl font-semibold tracking-tight">
          {APP_NAME}
          <span className="text-accent">.</span>
        </h1>
      </div>
      {children}
    </main>
  );
}