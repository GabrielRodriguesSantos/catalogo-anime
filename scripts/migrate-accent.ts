import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function resolveDatabasePath(url: string | undefined): string {
  const fallback = "./prisma/dev.db";
  if (!url) return fallback;
  const value = url.trim();
  if (value === ":memory:") return value;
  return value.startsWith("file:") ? value.slice("file:".length) : value;
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: resolveDatabasePath(process.env.DATABASE_URL),
    }),
    log: ["error"],
  });
}

const prisma = createPrismaClient();

async function main() {
  const rows = await prisma.userSetting.findMany({ select: { userId: true, data: true } });
  let updated = 0;
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.data);
      if (parsed && parsed.accent === "zinc") {
        parsed.accent = "red";
        await prisma.userSetting.update({
          where: { userId: row.userId },
          data: { data: JSON.stringify(parsed) },
        });
        updated++;
      }
    } catch {
      // ignore rows with invalid JSON
    }
  }
  console.log(`accent migrado para red: ${updated} de ${rows.length} usuários`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());