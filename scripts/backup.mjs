#!/usr/bin/env node
/**
 * Backup e restauração do Catálogo (SQLite + uploads).
 *
 * Uso:
 *   node scripts/backup.mjs                      cria um backup completo
 *   node scripts/backup.mjs --reason "<motivo>"  backup com motivo registrado
 *   node scripts/backup.mjs --list               lista backups existentes
 *   node scripts/backup.mjs --restore <id>       restaura um backup (cria cópia de segurança antes)
 *   node scripts/backup.mjs --keep <n>           mantém apenas os <n> backups mais recentes
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = path.join(ROOT, "prisma", "dev.db");
const UPLOADS_PATH = path.join(ROOT, "public", "uploads");
const BACKUPS_DIR = path.join(ROOT, "backups");
const MANIFEST_PATH = path.join(BACKUPS_DIR, "manifest.json");
const DEFAULT_KEEP = 4;

const adapterRequire = createRequire(
  path.join(ROOT, "node_modules/@prisma/adapter-better-sqlite3/dist/index.js")
);

function timestampId(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

function parseArgs(argv) {
  const args = { rest: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--reason" || arg === "--before") {
      args.reason = argv[i + 1];
      i += 1;
    } else if (arg === "--keep") {
      args.keep = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--list") {
      args.list = true;
    } else if (arg === "--restore") {
      args.restore = argv[i + 1];
      i += 1;
    } else {
      args.rest.push(arg);
    }
  }
  return args;
}

async function sha256Of(filePath) {
  const hash = createHash("sha256");
  const stream = await fs.open(filePath, "r");
  const buffer = Buffer.alloc(1024 * 1024);
  try {
    let read = await stream.read(buffer, 0, buffer.length, null);
    while (read.bytesRead > 0) {
      hash.update(buffer.subarray(0, read.bytesRead));
      read = await stream.read(buffer, 0, buffer.length, null);
    }
  } finally {
    await stream.close();
  }
  return hash.digest("hex");
}

async function dirStats(dir) {
  let files = 0;
  let bytes = 0;
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        files += 1;
        bytes += (await fs.stat(full)).size;
      }
    }
  }
  await walk(dir);
  return { files, bytes };
}

async function readManifest() {
  try {
    return JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  } catch {
    return { backups: [] };
  }
}

async function writeManifest(manifest) {
  await fs.mkdir(BACKUPS_DIR, { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

async function loadBackupDatabase() {
  const Database = adapterRequire("better-sqlite3");
  const db = new Database(DB_PATH, { readonly: true });
  return db;
}

async function createBackup(reason = "", keep = DEFAULT_KEEP) {
  if (!(await fs.access(DB_PATH).then(() => true).catch(() => false))) {
    console.error(`Banco de dados não encontrado em ${DB_PATH}. Nada a fazer.`);
    process.exit(1);
  }

  await fs.mkdir(BACKUPS_DIR, { recursive: true });
  const id = timestampId();
  const backupDir = path.join(BACKUPS_DIR, id);
  await fs.mkdir(backupDir, { recursive: true });

  const db = await loadBackupDatabase();
  const dbBackupPath = path.join(backupDir, "dev.db");
  try {
    await db.backup(dbBackupPath);
  } finally {
    db.close();
  }

  const manifest = await readManifest();

  let uploads = null;
  if (await fs.access(UPLOADS_PATH).then(() => true).catch(() => false)) {
    await fs.cp(UPLOADS_PATH, path.join(backupDir, "uploads"), {
      recursive: true,
    });
    uploads = await dirStats(path.join(backupDir, "uploads"));
  }

  const dbSize = (await fs.stat(dbBackupPath)).size;
  const entry = {
    id,
    createdAt: new Date().toISOString(),
    reason: reason || "",
    dbSizeBytes: dbSize,
    dbSha256: await sha256Of(dbBackupPath),
    uploadsFiles: uploads?.files ?? 0,
    uploadsSizeBytes: uploads?.bytes ?? 0,
  };

  manifest.backups.push(entry);
  manifest.backups.sort((a, b) => (a.id < b.id ? 1 : -1));
  const pruned = manifest.backups.slice(keep);
  manifest.backups = manifest.backups.slice(0, keep);
  for (const old of pruned) {
    await fs.rm(path.join(BACKUPS_DIR, old.id), { recursive: true, force: true });
  }
  await writeManifest(manifest);

  console.log(`Backup criado: backups/${id}`);
  console.log(`  banco: ${(entry.dbSizeBytes / 1024).toFixed(1)} KB`);
  console.log(
    `  uploads: ${entry.uploadsFiles} arquivo(s), ${(entry.uploadsSizeBytes / 1024).toFixed(1)} KB`
  );
  if (pruned.length > 0) {
    console.log(`  excluídos (limite ${keep}): ${pruned.map((b) => b.id).join(", ")}`);
  }
  return entry;
}

async function listBackups() {
  const manifest = await readManifest();
  if (manifest.backups.length === 0) {
    console.log("Nenhum backup encontrado em ./backups.");
    return;
  }
  console.log("Backups disponíveis:");
  for (const entry of manifest.backups) {
    const kb = (entry.dbSizeBytes / 1024).toFixed(1);
    const suffix = entry.reason ? `  (${entry.reason})` : "";
    console.log(
      `  ${entry.id}  ${entry.createdAt}  db=${kb} KB  uploads=${entry.uploadsFiles}${suffix}`
    );
  }
}

async function restoreBackup(id) {
  const manifest = await readManifest();
  const entry = manifest.backups.find((b) => b.id === id);
  if (!entry) {
    console.error(`Backup "${id}" não encontrado. Use --list para ver os disponíveis.`);
    process.exit(1);
  }
  const dbBackupPath = path.join(BACKUPS_DIR, id, "dev.db");
  if (!(await fs.access(dbBackupPath).then(() => true).catch(() => false))) {
    console.error(`Arquivo de backup ausente: ${dbBackupPath}`);
    process.exit(1);
  }

  const preDir = path.join(BACKUPS_DIR, `_pre-restore-${timestampId()}`);
  await fs.mkdir(preDir, { recursive: true });
  if (await fs.access(DB_PATH).then(() => true).catch(() => false)) {
    await fs.copyFile(DB_PATH, path.join(preDir, "dev.db"));
  }

  await fs.copyFile(dbBackupPath, DB_PATH);
  console.log(`Banco restaurado a partir de ${id}.`);
  console.log(`Cópia de segurança do estado anterior: ${preDir}`);

  const uploadsBackup = path.join(BACKUPS_DIR, id, "uploads");
  if (await fs.access(uploadsBackup).then(() => true).catch(() => false)) {
    await fs.rm(UPLOADS_PATH, { recursive: true, force: true });
    await fs.cp(uploadsBackup, UPLOADS_PATH, { recursive: true });
    console.log("Uploads restaurados.");
  }
  console.log("Se o servidor estiver rodando, reinicie-o para usar os dados restaurados.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.list) return listBackups();
  if (args.restore) return restoreBackup(args.restore);
  const keep = Number.isFinite(args.keep) && args.keep >= 1 ? args.keep : DEFAULT_KEEP;
  await createBackup(args.reason ?? "", keep);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});