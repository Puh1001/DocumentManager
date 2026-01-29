import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { StoragePathBuilder } from "../src/modules/storage/utils/storage-path.util";

const prisma = new PrismaClient();

/**
 * Migrate legacy storage layout to new per-section layout:
 * - Current files:  {dept}/{Section}/{documentId}{ext}
 * - Version files:  {dept}/{Section}/versions/{documentId}/vNNN_timestamp_user.ext
 *
 * The script:
 * - Computes expected new paths via StoragePathBuilder
 * - Moves physical files on SMB (rename, or copy+delete fallback)
 * - Updates DB filePath for documents + document_versions
 * - Logs conflicts and missing files for manual follow-up
 *
 * Run:
 *   npx ts-node apps/api/scripts/migrate-storage-layout.ts
 *
 * Dry run:
 *   npx ts-node apps/api/scripts/migrate-storage-layout.ts --dry-run
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
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr?.code === "EXDEV" || nodeErr?.code === "EPERM") {
        await fs.promises.copyFile(fromFull, toFull);
        await fs.promises.unlink(fromFull);
        return "moved";
      }
      throw err;
    }
  }

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

function normalizeDbPath(p: string): string {
  return p.replace(/\\/g, "/");
}

function getExtensionFromDocument(doc: {
  filePath: string;
  fileName: string;
}): string {
  const fromPath = path.extname(doc.filePath || "");
  if (fromPath) return fromPath.toLowerCase();
  const fromName = path.extname(doc.fileName || "");
  return fromName.toLowerCase();
}

function getExtensionFromVersion(version: {
  filePath: string;
  fileName: string;
}): string {
  const fromPath = path.extname(version.filePath || "");
  if (fromPath) return fromPath.toLowerCase();
  const fromName = path.extname(version.fileName || "");
  return fromName.toLowerCase();
}

async function migrateDocumentsAndVersions(dryRun: boolean) {
  const smbBasePath = resolveSmbBasePath();

  console.log("📁 Storage layout migration");
  console.log(`- SMB basePath: ${smbBasePath}`);
  console.log(`- dryRun: ${dryRun}\n`);

  // Load documents with folders and latest version metadata
  const documents = await prisma.document.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      folder: true,
      versions: true,
    },
  });

  let docsMoved = 0;
  let docsSkipped = 0;
  let versionsMoved = 0;
  let versionsSkipped = 0;
  let conflicts = 0;

  for (const doc of documents) {
    const folder = doc.folder;
    if (!folder) {
      docsSkipped++;
      continue;
    }

    const oldPathRaw = doc.filePath || "";
    if (!oldPathRaw) {
      docsSkipped++;
      continue;
    }

    const sectionRoot = StoragePathBuilder.deriveSectionRootFromFolderPath(
      folder.path,
    );
    const ext = getExtensionFromDocument({
      filePath: oldPathRaw,
      fileName: doc.fileName,
    });
    const newCurrentRel = StoragePathBuilder.buildCurrentFilePath(
      sectionRoot,
      doc.id,
      ext,
    );

    const oldNorm = normalizeDbPath(oldPathRaw);
    const newNorm = normalizeDbPath(newCurrentRel);

    if (!sectionRoot || oldNorm === newNorm) {
      docsSkipped++;
      continue;
    }

    const fromFull = toFullPath(smbBasePath, oldNorm);
    const toFull = toFullPath(smbBasePath, newNorm);

    if (dryRun) {
      console.log(`[DRY] document ${doc.id}: ${oldNorm} -> ${newNorm}`);
      docsMoved++;
    } else {
      const result = await moveFile(fromFull, toFull);
      if (result === "skipped_conflict") {
        conflicts++;
        console.warn(
          `⚠️ document ${doc.id}: conflict (dest exists, size differs). Skip DB update.`,
        );
      } else if (result === "missing") {
        docsSkipped++;
        console.warn(
          `⚠️ document ${doc.id}: missing both source and dest. Skip.`,
        );
      } else {
        await prisma.document.update({
          where: { id: doc.id },
          data: { filePath: newNorm },
        });
        docsMoved++;
      }
    }

    // Migrate versions for this document
    for (const v of doc.versions) {
      const oldVersionPathRaw = v.filePath || "";
      if (!oldVersionPathRaw) {
        versionsSkipped++;
        continue;
      }

      const vExt = getExtensionFromVersion({
        filePath: oldVersionPathRaw,
        fileName: v.fileName,
      });

      const newVersionRel = StoragePathBuilder.buildVersionFilePath(
        sectionRoot,
        doc.id,
        v.version,
        v.createdBy,
        vExt,
      );

      const oldVNorm = normalizeDbPath(oldVersionPathRaw);
      const newVNorm = normalizeDbPath(newVersionRel);

      if (oldVNorm === newVNorm) {
        versionsSkipped++;
        continue;
      }

      const fromVFull = toFullPath(smbBasePath, oldVNorm);
      const toVFull = toFullPath(smbBasePath, newVNorm);

      if (dryRun) {
        console.log(
          `[DRY] version ${v.id} (doc ${doc.id}): ${oldVNorm} -> ${newVNorm}`,
        );
        versionsMoved++;
      } else {
        const resultV = await moveFile(fromVFull, toVFull);
        if (resultV === "skipped_conflict") {
          conflicts++;
          console.warn(
            `⚠️ version ${v.id}: conflict (dest exists, size differs). Skip DB update.`,
          );
        } else if (resultV === "missing") {
          versionsSkipped++;
          console.warn(
            `⚠️ version ${v.id}: missing both source and dest. Skip.`,
          );
        } else {
          await prisma.documentVersion.update({
            where: { id: v.id },
            data: { filePath: newVNorm },
          });
          versionsMoved++;
        }
      }
    }
  }

  console.log("\n📊 Migration summary");
  console.log(
    `- documents moved/updated: ${docsMoved}, skipped: ${docsSkipped}`,
  );
  console.log(
    `- versions moved/updated:  ${versionsMoved}, skipped: ${versionsSkipped}`,
  );
  console.log(`- conflicts:               ${conflicts}`);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  await migrateDocumentsAndVersions(dryRun);

  console.log("\n✅ Layout migration completed (logical).");
  console.log(
    "   NOTE: Run this first in staging with --dry-run, then without, and always have DB + SMB backups.",
  );
}

main()
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
