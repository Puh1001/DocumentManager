import { Prisma, PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

/**
 * Fix legacy duplicated KPI folder paths:
 * - /current/current/ -> /current/
 * - /current/version/ -> /version/
 * - /current/versions/ -> /versions/
 *
 * This script:
 * - Moves physical files on SMB (rename, or copy+delete fallback)
 * - Updates DB paths for documents + document_versions
 * - Best-effort deletes empty legacy directories (current/current, current/version)
 *
 * Run:
 *   npx ts-node apps/api/scripts/fix-kpi-current-current-paths.ts
 *
 * Dry run:
 *   npx ts-node apps/api/scripts/fix-kpi-current-current-paths.ts --dry-run
 */

function envBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v == null) return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function resolveSmbBasePath(): string {
  const platform = process.platform === "win32" ? "windows" : "linux";

  if (platform === "windows") {
    const useMountedDrive = envBool("SMB_USE_MOUNTED_DRIVE", false);
    if (useMountedDrive) {
      const drive = process.env.SMB_MOUNTED_DRIVE ?? "Z:";
      const share = process.env.SMB_SHARE ?? "Public";
      const basePath = process.env.SMB_BASE_PATH ?? "";
      const fullBasePath = basePath
        ? path.join(drive, share, basePath.replace(/\\/g, path.sep))
        : path.join(drive, share);
      return fullBasePath;
    }

    const server = process.env.SMB_SERVER ?? "10.0.60.30";
    const share = process.env.SMB_SHARE ?? "Public";
    const basePath =
      process.env.SMB_BASE_PATH ?? "IT-Information Technology Dept\\devTest";

    return `\\\\${server}\\${share}\\${basePath}`;
  }

  const mountPath = process.env.SMB_MOUNT_PATH ?? "/shared";
  const basePath = process.env.SMB_BASE_PATH ?? "";
  if (!basePath) return mountPath;

  const normalizedBasePath = basePath.replace(/\\/g, "/");
  return path.join(mountPath, normalizedBasePath);
}

function toFullPath(basePath: string, relativePath: string): string {
  if (!relativePath) return basePath;
  const normalized = relativePath
    .replace(/\\/g, path.sep)
    .replace(/\//g, path.sep);
  return path.join(basePath, normalized);
}

function normalizeDbPath(p: string): string {
  const normalized = p.replace(/\\/g, "/");
  return normalized
    .replace(/\/current\/current\//g, "/current/")
    .replace(/\/current\/version\//g, "/version/")
    .replace(/\/current\/versions\//g, "/versions/");
}

async function exists(fullPath: string): Promise<boolean> {
  try {
    await fs.promises.access(fullPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(fullDirPath: string) {
  await fs.promises.mkdir(fullDirPath, { recursive: true });
}

async function moveFile(
  fromFull: string,
  toFull: string,
): Promise<"moved" | "deleted_old" | "skipped_conflict" | "missing"> {
  const fromExists = await exists(fromFull);
  const toExists = await exists(toFull);

  if (!fromExists && !toExists) return "missing";
  if (!fromExists && toExists) return "moved";

  if (!toExists) {
    await ensureDir(path.dirname(toFull));
    try {
      await fs.promises.rename(fromFull, toFull);
      return "moved";
    } catch (err: unknown) {
      // Cross-device rename fallback (or SMB-specific limitations)
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr?.code === "EXDEV" || nodeErr?.code === "EPERM") {
        await fs.promises.copyFile(fromFull, toFull);
        await fs.promises.unlink(fromFull);
        return "moved";
      }
      throw err;
    }
  }

  // Destination exists: delete old only if size matches (safe-ish)
  const [fromStat, toStat] = await Promise.all([
    fs.promises.stat(fromFull),
    fs.promises.stat(toFull),
  ]);

  if (fromStat.size === toStat.size) {
    await fs.promises.unlink(fromFull);
    return "deleted_old";
  }

  return "skipped_conflict";
}

async function tryRemoveEmptyDir(fullDirPath: string): Promise<boolean> {
  try {
    const entries = await fs.promises.readdir(fullDirPath);
    if (entries.length > 0) return false;
    await fs.promises.rmdir(fullDirPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const smbBasePath = resolveSmbBasePath();

  console.log("🔧 Fix KPI legacy paths");
  console.log(`- SMB basePath: ${smbBasePath}`);
  console.log(`- dryRun: ${dryRun}\n`);

  const docWhere: Prisma.DocumentWhereInput = {
    OR: [
      { filePath: { contains: "/current/current/" } },
      { filePath: { contains: "/current/version/" } },
      { filePath: { contains: "/current/versions/" } },
      { filePath: { contains: "\\current\\current\\" } },
      { filePath: { contains: "\\current\\version\\" } },
      { filePath: { contains: "\\current\\versions\\" } },
    ],
  };

  const docs = await prisma.document.findMany({
    where: docWhere,
    select: { id: true, filePath: true },
  });

  const versions = await prisma.documentVersion.findMany({
    where: docWhere as Prisma.DocumentVersionWhereInput,
    select: { id: true, documentId: true, filePath: true },
  });

  console.log(`📄 Found documents to fix: ${docs.length}`);
  console.log(`🧾 Found document versions to fix: ${versions.length}\n`);

  const dirsToTryDelete = new Set<string>();

  let docsUpdated = 0;
  let docsSkipped = 0;
  let versionsUpdated = 0;
  let versionsSkipped = 0;
  let conflicts = 0;

  for (const d of docs) {
    const oldDbPath = d.filePath ?? "";
    const oldNorm = oldDbPath.replace(/\\/g, "/");
    const newNorm = normalizeDbPath(oldDbPath);

    if (!oldDbPath || oldNorm === newNorm) {
      docsSkipped++;
      continue;
    }

    const fromFull = toFullPath(smbBasePath, oldNorm);
    const toFull = toFullPath(smbBasePath, newNorm);

    const legacyDirRel = path.posix.dirname(oldNorm);
    if (legacyDirRel.endsWith("/current/current") || legacyDirRel.endsWith("/current/version")) {
      dirsToTryDelete.add(legacyDirRel);
    }

    if (dryRun) {
      console.log(`[DRY] document ${d.id}: ${oldNorm} -> ${newNorm}`);
      docsUpdated++;
      continue;
    }

    const result = await moveFile(fromFull, toFull);
    if (result === "skipped_conflict") {
      conflicts++;
      console.warn(`⚠️  document ${d.id}: conflict (dest exists, size differs). Skip DB update.`);
      continue;
    }
    if (result === "missing") {
      docsSkipped++;
      console.warn(`⚠️  document ${d.id}: missing both source and dest. Skip.`);
      continue;
    }

    await prisma.document.update({
      where: { id: d.id },
      data: { filePath: newNorm },
    });
    docsUpdated++;
  }

  for (const v of versions) {
    const oldDbPath = v.filePath ?? "";
    const oldNorm = oldDbPath.replace(/\\/g, "/");
    const newNorm = normalizeDbPath(oldDbPath);

    if (!oldDbPath || oldNorm === newNorm) {
      versionsSkipped++;
      continue;
    }

    const fromFull = toFullPath(smbBasePath, oldNorm);
    const toFull = toFullPath(smbBasePath, newNorm);

    const legacyDirRel = path.posix.dirname(oldNorm);
    if (legacyDirRel.endsWith("/current/current") || legacyDirRel.endsWith("/current/version")) {
      dirsToTryDelete.add(legacyDirRel);
    }

    if (dryRun) {
      console.log(`[DRY] version ${v.id}: ${oldNorm} -> ${newNorm}`);
      versionsUpdated++;
      continue;
    }

    const result = await moveFile(fromFull, toFull);
    if (result === "skipped_conflict") {
      conflicts++;
      console.warn(`⚠️  version ${v.id}: conflict (dest exists, size differs). Skip DB update.`);
      continue;
    }
    if (result === "missing") {
      versionsSkipped++;
      console.warn(`⚠️  version ${v.id}: missing both source and dest. Skip.`);
      continue;
    }

    await prisma.documentVersion.update({
      where: { id: v.id },
      data: { filePath: newNorm },
    });
    versionsUpdated++;
  }

  // Best-effort delete empty legacy dirs (deepest first)
  if (!dryRun && dirsToTryDelete.size > 0) {
    const sorted = Array.from(dirsToTryDelete).sort((a, b) => b.length - a.length);
    let deletedDirs = 0;
    for (const dirRel of sorted) {
      const fullDir = toFullPath(smbBasePath, dirRel);
      const ok = await tryRemoveEmptyDir(fullDir);
      if (ok) deletedDirs++;
    }
    console.log(`\n🧹 Deleted empty legacy dirs: ${deletedDirs}/${sorted.length}`);
  }

  console.log("\n📊 Summary");
  console.log(`- documents updated: ${docsUpdated}, skipped: ${docsSkipped}`);
  console.log(`- versions updated:  ${versionsUpdated}, skipped: ${versionsSkipped}`);
  console.log(`- conflicts:         ${conflicts}`);
  console.log("\n✅ Done");
}

main()
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

