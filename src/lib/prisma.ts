import "server-only";

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

export function resolveDatabasePath(url: string | undefined): string {
  const fallback = "./prisma/dev.db";
  if (!url) return fallback;
  const value = url.trim();
  if (value === ":memory:") return value;
  return value.startsWith("file:") ? value.slice("file:".length) : value;
}

export function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: resolveDatabasePath(process.env.DATABASE_URL),
    }),
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}