#!/usr/bin/env node
/**
 * Inicialização do banco/upload de dados em ambientes com disco persistente (Render).
 *
 *   node scripts/init-db.mjs prepare   cria diretórios do banco e de uploads
 *   node scripts/init-db.mjs seed      roda o seed apenas se o banco estiver vazio
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const adapterRequire = createRequire(
  path.join(ROOT, "node_modules/@prisma/adapter-better-sqlite3/dist/index.js")
);

function resolveDatabasePath(url) {
  const fallback = "./prisma/dev.db";
  if (!url) return fallback;
  const value = url.trim();
  if (value === ":memory:") return value;
  return value.startsWith("file:") ? value.slice("file:".length) : value;
}

async function ensureDirectories() {
  const dbPath = resolveDatabasePath(process.env.DATABASE_URL);
  if (dbPath !== ":memory:") {
    await fs.mkdir(path.dirname(path.resolve(ROOT, dbPath)), { recursive: true });
  }
  const uploadsRoot =
    process.env.UPLOADS_ROOT?.trim() || path.join(ROOT, "public", "uploads");
  await fs.mkdir(path.resolve(ROOT, uploadsRoot), { recursive: true });
  console.log("init: diretórios de dados prontos.");
}

async function countActiveUsers() {
  const dbPath = resolveDatabasePath(process.env.DATABASE_URL);
  if (dbPath === ":memory:") return 0;
  const absolute = path.resolve(ROOT, dbPath);
  try {
    await fs.access(absolute);
  } catch {
    return 0;
  }
  const Database = adapterRequire("better-sqlite3");
  const db = new Database(absolute, { readonly: true });
  try {
    const row = db
      .prepare("SELECT COUNT(*) AS c FROM User WHERE deletedAt IS NULL")
      .get();
    return Number(row?.c ?? 0);
  } catch {
    return 0;
  } finally {
    db.close();
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} saiu com código ${code}`))));
  });
}

async function seedIfEmpty() {
  const users = await countActiveUsers();
  if (users > 0) {
    console.log(`init: banco já possui ${users} usuário(s). Seed pulado.`);
    return;
  }
  console.log("init: banco vazio — executando seed…");
  const npmCli = path.join(ROOT, "node_modules", "npm", "bin", "npm-cli.js");
  await run(process.execPath, [npmCli, "run", "db:seed"]);
}

function main() {
  const command = process.argv[2] ?? "prepare";
  if (command === "prepare") return ensureDirectories().then(() => undefined);
  if (command === "seed") return seedIfEmpty().then(() => undefined);
  throw new Error(`Comando desconhecido: ${command}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});