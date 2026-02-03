import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

/**
 * Migration script to migrate storage structure to mandatory format:
 * - Rename "Documents" → "ISO_documents"
 * - Rename "delete files"/"Deleted files" → "Delete_files"
 * - Move files from {section}/current/ to {section}/
 * - Handle nested current/current folders
 * - Update database paths (folders and documents)
 * - Remove empty "current" folders
 *
 * Run:
 *   npx ts-node apps/api/scripts/migrate-storage-structure.ts
 *
 * Dry run:
 *   npx ts-node apps/api/scripts/migrate-storage-structure.ts --dry-run
 */

interface MigrationStats {
  foldersRenamed: number;
  filesMoved: number;
  documentsUpdated: number;
  foldersUpdated: number;
  errors: Array<{ type: string; path: string; error: string }>;
  skipped: Array<{ type: string; path: string; reason: string }>;
}

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
      // Default empty so Z: = share root (tree first level = AC, BOC_SOI...)
      const share = process.env.SMB_SHARE ?? "";
      const basePath = process.env.SMB_BASE_PATH ?? "";
      if (!share && !basePath) return path.join(drive, "");
      if (!basePath) return path.join(drive, share);
      return path.join(drive, share, basePath.replace(/\\/g, path.sep));
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

async function isEmptyDirectory(fullPath: string): Promise<boolean> {
  try {
    const entries = await fs.promises.readdir(fullPath);
    return entries.length === 0;
  } catch {
    return false;
  }
}

/**
 * Validate path for security and compatibility
 */
function validatePath(pathStr: string): boolean {
  // Check for path traversal
  if (pathStr.includes("..")) {
    return false;
  }
  // Windows path length limit (260 chars)
  if (pathStr.length > 260) {
    return false;
  }
  // Check for null bytes
  if (pathStr.includes("\0")) {
    return false;
  }
  return true;
}

/**
 * Normalize path by removing /current segments
 */
function normalizePath(oldPath: string): string {
  let newPath = oldPath;
  // Replace /current/ with / (handles all occurrences)
  while (newPath.includes("/current/")) {
    newPath = newPath.replace(/\/current\//g, "/");
  }
  // Remove trailing /current
  newPath = newPath.replace(/\/current$/, "");
  // Clean up double slashes
  newPath = newPath.replace(/\/+/g, "/");
  return newPath;
}

async function ensureDir(fullDirPath: string) {
  await fs.promises.mkdir(fullDirPath, { recursive: true });
}

async function moveFile(
  fromFull: string,
  toFull: string,
  dryRun: boolean
): Promise<"moved" | "skipped_conflict" | "missing" | "error"> {
  if (dryRun) {
    return "moved";
  }

  // Validate paths
  if (!validatePath(fromFull) || !validatePath(toFull)) {
    return "error";
  }

  const fromExists = await exists(fromFull);
  const toExists = await exists(toFull);

  if (!fromExists) {
    return "missing";
  }

  if (toExists) {
    return "skipped_conflict";
  }

  try {
    await ensureDir(path.dirname(toFull));
    await fs.promises.rename(fromFull, toFull);
    return "moved";
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    const errorMsg = `Failed to move file: ${error.message} (code: ${error.code || "unknown"})`;
    console.error(`Error moving file ${fromFull} → ${toFull}: ${errorMsg}`);
    return "error";
  }
}

async function renameFolder(
  fromFull: string,
  toFull: string,
  dryRun: boolean
): Promise<"renamed" | "skipped_conflict" | "missing" | "error"> {
  if (dryRun) {
    return "renamed";
  }

  // Validate paths (only for live mode)
  if (!validatePath(fromFull) || !validatePath(toFull)) {
    return "error";
  }

  const fromExists = await exists(fromFull);
  const toExists = await exists(toFull);

  if (!fromExists) {
    return "missing";
  }

  if (toExists) {
    return "skipped_conflict";
  }

  try {
    await fs.promises.rename(fromFull, toFull);
    return "renamed";
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    console.error(
      `Error renaming folder ${fromFull} → ${toFull}: ${error.message}`
    );
    return "error";
  }
}

async function removeEmptyFolder(
  fullPath: string,
  dryRun: boolean
): Promise<boolean> {
  if (dryRun) {
    return true;
  }

  try {
    if (await isEmptyDirectory(fullPath)) {
      await fs.promises.rmdir(fullPath);
      return true;
    }
    return false;
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    console.error(`Error removing folder ${fullPath}: ${error.message}`);
    return false;
  }
}

async function migrateStorageStructure(dryRun: boolean = true) {
  const basePath = resolveSmbBasePath();
  const stats: MigrationStats = {
    foldersRenamed: 0,
    filesMoved: 0,
    documentsUpdated: 0,
    foldersUpdated: 0,
    errors: [],
    skipped: [],
  };

  console.log("=".repeat(80));
  console.log("Storage Structure Migration");
  console.log("=".repeat(80));
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`SMB Base Path: ${basePath}`);
  console.log("");

  try {
    // Step 1: Rename "Documents" → "ISO_documents" folders
    console.log("Step 1: Renaming 'Documents' → 'ISO_documents' folders...");
    const documentsFolders = await prisma.folder.findMany({
      where: {
        name: "Documents",
        deletedAt: null,
      },
      include: {
        department: true,
      },
    });

    // Collect updates for batch processing
    const folderUpdates: Array<{
      id: string;
      oldPath: string;
      newPath: string;
      renameResult: "renamed" | "skipped_conflict" | "missing" | "error";
    }> = [];

    for (const folder of documentsFolders) {
      const oldPath = folder.path;
      const newPath = oldPath.replace(/\/Documents(\/|$)/g, "/ISO_documents$1");

      // Validate paths
      if (!validatePath(oldPath) || !validatePath(newPath)) {
        stats.errors.push({
          type: "folder_rename",
          path: oldPath,
          error: "Invalid path detected (path traversal or too long)",
        });
        continue;
      }

      const oldFullPath = toFullPath(basePath, oldPath);
      const newFullPath = toFullPath(basePath, newPath);

      console.log(`  Renaming: ${oldPath} → ${newPath}`);

      // Rename on SMB
      const renameResult = await renameFolder(oldFullPath, newFullPath, dryRun);
      folderUpdates.push({
        id: folder.id,
        oldPath,
        newPath,
        renameResult,
      });

      if (renameResult === "renamed") {
        stats.foldersRenamed++;
      } else if (renameResult === "skipped_conflict") {
        stats.skipped.push({
          type: "folder",
          path: oldPath,
          reason: "Target already exists",
        });
      } else if (renameResult === "missing") {
        stats.skipped.push({
          type: "folder",
          path: oldPath,
          reason: "Source folder not found on SMB",
        });
      } else if (renameResult === "error") {
        stats.errors.push({
          type: "folder_rename",
          path: oldPath,
          error: "Failed to rename on SMB - check error logs for details",
        });
      }
    }

    // Batch update database in transaction
    if (!dryRun && folderUpdates.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const update of folderUpdates) {
          // Only update if rename was successful or missing (still update DB)
          if (
            update.renameResult === "renamed" ||
            update.renameResult === "missing"
          ) {
            await tx.folder.update({
              where: { id: update.id },
              data: {
                name: "ISO_documents",
                path: update.newPath,
              },
            });
            stats.foldersUpdated++;
          }
        }
      });
    }

    console.log(`  ✓ Renamed ${stats.foldersRenamed} folders\n`);

    // Step 2: Rename "delete files"/"Deleted files" → "Delete_files"
    console.log(
      "Step 2: Renaming 'delete files'/'Deleted files' → 'Delete_files' folders..."
    );
    const deleteFolders = await prisma.folder.findMany({
      where: {
        OR: [
          { name: "delete files" },
          { name: "Deleted files" },
          { name: "Delete files" },
        ],
        deletedAt: null,
      },
      include: {
        department: true,
      },
    });

    // Collect updates for batch processing
    const deleteFolderUpdates: Array<{
      id: string;
      oldPath: string;
      newPath: string;
      renameResult: "renamed" | "skipped_conflict" | "missing" | "error";
    }> = [];

    for (const folder of deleteFolders) {
      const oldPath = folder.path;
      // Replace various forms: "delete files", "Deleted files", "Delete files"
      const newPath = oldPath
        .replace(/\/delete files(\/|$)/gi, "/Delete_files$1")
        .replace(/\/Deleted files(\/|$)/g, "/Delete_files$1")
        .replace(/\/Delete files(\/|$)/g, "/Delete_files$1");

      // Validate paths
      if (!validatePath(oldPath) || !validatePath(newPath)) {
        stats.errors.push({
          type: "folder_rename",
          path: oldPath,
          error: "Invalid path detected (path traversal or too long)",
        });
        continue;
      }

      const oldFullPath = toFullPath(basePath, oldPath);
      const newFullPath = toFullPath(basePath, newPath);

      console.log(`  Renaming: ${oldPath} → ${newPath}`);

      // Rename on SMB
      const renameResult = await renameFolder(oldFullPath, newFullPath, dryRun);
      deleteFolderUpdates.push({
        id: folder.id,
        oldPath,
        newPath,
        renameResult,
      });

      if (renameResult === "renamed") {
        stats.foldersRenamed++;
      } else if (renameResult === "skipped_conflict") {
        stats.skipped.push({
          type: "folder",
          path: oldPath,
          reason: "Target already exists",
        });
      } else if (renameResult === "missing") {
        stats.skipped.push({
          type: "folder",
          path: oldPath,
          reason: "Source folder not found on SMB",
        });
      } else if (renameResult === "error") {
        stats.errors.push({
          type: "folder_rename",
          path: oldPath,
          error: "Failed to rename on SMB - check error logs for details",
        });
      }
    }

    // Batch update database in transaction
    if (!dryRun && deleteFolderUpdates.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const update of deleteFolderUpdates) {
          // Only update if rename was successful or missing (still update DB)
          if (
            update.renameResult === "renamed" ||
            update.renameResult === "missing"
          ) {
            await tx.folder.update({
              where: { id: update.id },
              data: {
                name: "Delete_files",
                path: update.newPath,
              },
            });
            stats.foldersUpdated++;
          }
        }
      });
    }

    console.log(`  ✓ Renamed ${stats.foldersRenamed} folders\n`);
    if (!dryRun && deleteFolders.length === 0 && stats.foldersRenamed === 0) {
      console.log(
        "  ℹ If SMB still has 'delete files' folders: use mounted drive (SMB_USE_MOUNTED_DRIVE=true, SMB_MOUNTED_DRIVE=Z:) or DB may already have updated names.\n"
      );
    }

    // Step 3: Move files from {section}/current/ to {section}/
    console.log(
      "Step 3: Moving files from 'current' subfolders to section roots..."
    );

    // Find all documents with file_path containing "/current/" or ending with "/current"
    const documentsInCurrent = await prisma.document.findMany({
      where: {
        OR: [
          { filePath: { contains: "/current/" } },
          { filePath: { endsWith: "/current" } },
        ],
        status: {
          not: "DELETED", // Skip deleted documents
        },
      },
      include: {
        folder: {
          include: {
            department: true,
          },
        },
      },
    });

    console.log(
      `  Found ${documentsInCurrent.length} documents in 'current' subfolders`
    );

    // Collect updates for batch processing
    const documentUpdates: Array<{
      id: string;
      oldPath: string;
      newPath: string;
      moveResult: "moved" | "skipped_conflict" | "missing" | "error";
    }> = [];

    for (const doc of documentsInCurrent) {
      const oldFilePath = doc.filePath;

      // Normalize path (remove /current segments)
      const newFilePath = normalizePath(oldFilePath);

      // Validate paths
      if (!validatePath(oldFilePath) || !validatePath(newFilePath)) {
        stats.errors.push({
          type: "file_move",
          path: oldFilePath,
          error: "Invalid path detected (path traversal or too long)",
        });
        continue;
      }

      // Skip if already at correct location
      if (oldFilePath === newFilePath) {
        continue;
      }

      // Skip if file is in versions folder (versions should stay in versions/)
      if (newFilePath.includes("/versions/")) {
        stats.skipped.push({
          type: "file",
          path: oldFilePath,
          reason: "File is in versions folder, keeping as-is",
        });
        continue;
      }

      console.log(`  Moving: ${oldFilePath} → ${newFilePath}`);

      const oldFullPath = toFullPath(basePath, oldFilePath);
      const newFullPath = toFullPath(basePath, newFilePath);

      // Move file on SMB
      const moveResult = await moveFile(oldFullPath, newFullPath, dryRun);
      documentUpdates.push({
        id: doc.id,
        oldPath: oldFilePath,
        newPath: newFilePath,
        moveResult,
      });

      if (moveResult === "moved") {
        stats.filesMoved++;
      } else if (moveResult === "skipped_conflict") {
        stats.skipped.push({
          type: "file",
          path: oldFilePath,
          reason: "Target file already exists",
        });
      } else if (moveResult === "missing") {
        stats.skipped.push({
          type: "file",
          path: oldFilePath,
          reason: "Source file not found on SMB",
        });
      } else if (moveResult === "error") {
        stats.errors.push({
          type: "file_move",
          path: oldFilePath,
          error: "Failed to move file - check error logs for details",
        });
      }
    }

    // Batch update database in transaction
    if (!dryRun && documentUpdates.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const update of documentUpdates) {
          // Update DB if file was moved or missing (still update DB path)
          if (
            update.moveResult === "moved" ||
            update.moveResult === "missing"
          ) {
            await tx.document.update({
              where: { id: update.id },
              data: {
                filePath: update.newPath,
              },
            });
            stats.documentsUpdated++;
          }
        }
      });
    }

    console.log(`  ✓ Moved ${stats.filesMoved} files\n`);
    if (!dryRun && documentsInCurrent.length > 0 && stats.filesMoved === 0) {
      console.log(
        "  ℹ If SMB still has files in 'current': ensure script uses same path as tree (e.g. SMB_USE_MOUNTED_DRIVE=true, SMB_MOUNTED_DRIVE=Z:).\n"
      );
    }

    // Step 4: Update folder paths in database (remove /current segments)
    console.log("Step 4: Updating folder paths in database...");
    const foldersWithCurrent = await prisma.folder.findMany({
      where: {
        OR: [
          { path: { contains: "/current/" } },
          { path: { endsWith: "/current" } },
        ],
        deletedAt: null,
      },
    });

    // Collect updates for batch processing
    const folderPathUpdates: Array<{
      id: string;
      oldPath: string;
      newPath: string;
    }> = [];

    for (const folder of foldersWithCurrent) {
      const oldPath = folder.path;
      const newPath = normalizePath(oldPath);

      // Validate paths
      if (!validatePath(oldPath) || !validatePath(newPath)) {
        stats.errors.push({
          type: "folder_path_update",
          path: oldPath,
          error: "Invalid path detected (path traversal or too long)",
        });
        continue;
      }

      if (oldPath === newPath) {
        continue;
      }

      console.log(`  Updating folder path: ${oldPath} → ${newPath}`);
      folderPathUpdates.push({ id: folder.id, oldPath, newPath });
    }

    // Group by newPath to handle unique constraint (multiple folders can normalize to same path)
    const byNewPath = new Map<
      string,
      Array<{ id: string; oldPath: string; newPath: string }>
    >();
    for (const u of folderPathUpdates) {
      const list = byNewPath.get(u.newPath) ?? [];
      list.push(u);
      byNewPath.set(u.newPath, list);
    }

    if (!dryRun && folderPathUpdates.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const [, group] of byNewPath) {
          const newPath = group[0].newPath;
          const groupIds = group.map((u) => u.id);
          // If another folder already has path = newPath (e.g. from a previous partial run), merge into it
          const existing = await tx.folder.findFirst({
            where: { path: newPath, deletedAt: null },
          });
          if (existing && !groupIds.includes(existing.id)) {
            await tx.document.updateMany({
              where: { folderId: { in: groupIds } },
              data: { folderId: existing.id },
            });
            await tx.folder.updateMany({
              where: { parentId: { in: groupIds } },
              data: { parentId: existing.id },
            });
            await tx.folder.updateMany({
              where: { id: { in: groupIds } },
              data: { deletedAt: new Date() },
            });
            stats.foldersUpdated++;
            continue;
          }
          if (group.length === 1) {
            await tx.folder.update({
              where: { id: group[0].id },
              data: { path: group[0].newPath },
            });
            stats.foldersUpdated++;
            continue;
          }
          // Multiple folders → same newPath: keep one (shortest oldPath), merge others, then update
          group.sort((a, b) => a.oldPath.length - b.oldPath.length);
          const kept = group[0];
          const duplicateIds = group.slice(1).map((u) => u.id);
          await tx.document.updateMany({
            where: { folderId: { in: duplicateIds } },
            data: { folderId: kept.id },
          });
          await tx.folder.updateMany({
            where: { parentId: { in: duplicateIds } },
            data: { parentId: kept.id },
          });
          await tx.folder.updateMany({
            where: { id: { in: duplicateIds } },
            data: { deletedAt: new Date() },
          });
          await tx.folder.update({
            where: { id: kept.id },
            data: { path: kept.newPath },
          });
          stats.foldersUpdated++;
        }
      });
    }

    // Step 4b: Update document_versions paths (remove /current segments)
    console.log("Step 4b: Updating document_versions paths...");
    const versionsInCurrent = await prisma.documentVersion.findMany({
      where: {
        OR: [
          { filePath: { contains: "/current/" } },
          { filePath: { endsWith: "/current" } },
        ],
      },
    });

    // Collect updates for batch processing
    const versionUpdates: Array<{
      id: string;
      oldPath: string;
      newPath: string;
    }> = [];

    for (const version of versionsInCurrent) {
      const oldPath = version.filePath;
      const newPath = normalizePath(oldPath);

      // Validate paths
      if (!validatePath(oldPath) || !validatePath(newPath)) {
        stats.errors.push({
          type: "version_path_update",
          path: oldPath,
          error: "Invalid path detected (path traversal or too long)",
        });
        continue;
      }

      if (oldPath === newPath) {
        continue;
      }

      console.log(`  Updating version path: ${oldPath} → ${newPath}`);
      versionUpdates.push({ id: version.id, oldPath, newPath });
    }

    // Batch update database in transaction
    let versionsUpdated = 0;
    if (!dryRun && versionUpdates.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const update of versionUpdates) {
          await tx.documentVersion.update({
            where: { id: update.id },
            data: {
              filePath: update.newPath,
            },
          });
          versionsUpdated++;
        }
      });
    }

    if (dryRun && versionUpdates.length > 0) {
      console.log(
        `  ✓ Would update ${versionUpdates.length} document version paths (dry run)\n`
      );
    } else {
      console.log(`  ✓ Updated ${versionsUpdated} document version paths\n`);
    }

    if (dryRun && folderPathUpdates.length > 0) {
      console.log(
        `  ✓ Would update ${folderPathUpdates.length} folder paths (dry run)\n`
      );
    } else {
      console.log(`  ✓ Updated ${stats.foldersUpdated} folder paths\n`);
    }

    // Step 5: Remove empty "current" folders
    console.log("Step 5: Removing empty 'current' folders...");
    const currentFolders = await prisma.folder.findMany({
      where: {
        name: "current",
        deletedAt: null,
      },
    });

    console.log(
      `  Found ${currentFolders.length} 'current' folders to check for cleanup`
    );

    // Collect folders to delete
    const foldersToDelete: Array<{ id: string; path: string }> = [];
    let emptyFoldersRemoved = 0;
    let currentFoldersProcessed = 0;

    for (const folder of currentFolders) {
      currentFoldersProcessed++;
      console.log(
        `  [${currentFoldersProcessed}/${currentFolders.length}] Checking '${folder.path}'...`
      );

      const fullPath = toFullPath(basePath, folder.path);
      const isEmpty = await isEmptyDirectory(fullPath);

      if (isEmpty) {
        console.log(`  Removing empty folder: ${folder.path}`);
        const removed = await removeEmptyFolder(fullPath, dryRun);
        if (removed) {
          emptyFoldersRemoved++;
          foldersToDelete.push({ id: folder.id, path: folder.path });
        }
      }

      // Progress log every 10 folders or at the end
      if (
        currentFoldersProcessed % 10 === 0 ||
        currentFoldersProcessed === currentFolders.length
      ) {
        console.log(
          `  Progress: checked ${currentFoldersProcessed}/${currentFolders.length} 'current' folders (removed ${emptyFoldersRemoved})`
        );
      }
    }

    // Batch update database in transaction
    if (!dryRun && foldersToDelete.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const folder of foldersToDelete) {
          await tx.folder.update({
            where: { id: folder.id },
            data: {
              deletedAt: new Date(),
            },
          });
        }
      });
    }

    console.log(`  ✓ Removed ${emptyFoldersRemoved} empty folders\n`);

    // Summary
    console.log("=".repeat(80));
    console.log("Migration Summary");
    console.log("=".repeat(80));
    console.log(`Folders renamed: ${stats.foldersRenamed}`);
    console.log(`Files moved: ${stats.filesMoved}`);
    console.log(`Documents updated: ${stats.documentsUpdated}`);
    console.log(`Folders updated: ${stats.foldersUpdated}`);
    console.log(`Errors: ${stats.errors.length}`);
    console.log(`Skipped: ${stats.skipped.length}`);

    if (stats.errors.length > 0) {
      console.log("\nErrors:");
      stats.errors.forEach((err) => {
        console.log(`  - ${err.type}: ${err.path} - ${err.error}`);
      });
    }

    if (stats.skipped.length > 0) {
      console.log("\nSkipped items:");
      stats.skipped.forEach((skip) => {
        console.log(`  - ${skip.type}: ${skip.path} - ${skip.reason}`);
      });
    }

    if (dryRun) {
      console.log("\n⚠️  This was a DRY RUN. No changes were made.");
      console.log(
        "Step 4/4b 'Would update N' counts above are the DB updates that would run."
      );
      console.log("Run without --dry-run to apply changes.");
    } else {
      console.log("\n✅ Migration completed!");
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("\n❌ Migration failed:", err.message);
    console.error(err.stack);
    throw error;
  }
}

// Main
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || args.includes("-d");

migrateStorageStructure(dryRun)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
