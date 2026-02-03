/**
 * SMB-only migration: rename folders and move files on disk (no DB changes).
 * Use when DB was already migrated but SMB (tree) was not.
 *
 * Steps: 1) Documents→ISO_documents 2) delete files→Delete_files 3) flatten current 4) remove empty current 5) version→versions 6) ensure 4 section folders per dept (KPI, ISO_documents, Maintenance, Delete_files)
 * Run: npx ts-node scripts/migrate-storage-structure-smb-only.ts
 * Dry: npx ts-node scripts/migrate-storage-structure-smb-only.ts --dry-run
 * When dest already exists (duplicate): use --overwrite to replace dest with source and remove duplicate in current.
 */

import * as fs from "fs";
import * as path from "path";

// Load .env when run via ts-node
const envPath = path.resolve(__dirname, "..", ".env");
try {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eq = trimmed.indexOf("=");
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          let val = trimmed.slice(eq + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          )
            val = val.slice(1, -1);
          process.env[key] = val;
        }
      }
    }
  }
} catch {
  // ignore
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
  return path.join(mountPath, basePath.replace(/\\/g, "/"));
}

function toFull(basePath: string, relativePath: string): string {
  if (!relativePath) return basePath;
  const norm = relativePath.replace(/\\/g, path.sep).replace(/\//g, path.sep);
  return path.join(basePath, norm);
}

function validatePath(p: string): boolean {
  if (p.includes("..") || p.length > 260 || p.includes("\0")) return false;
  return true;
}

async function exists(fullPath: string): Promise<boolean> {
  try {
    await fs.promises.access(fullPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isEmptyDir(fullPath: string): Promise<boolean> {
  try {
    const entries = await fs.promises.readdir(fullPath);
    return entries.length === 0;
  } catch {
    return false;
  }
}

async function ensureDir(fullPath: string) {
  await fs.promises.mkdir(fullPath, { recursive: true });
}

async function renameDir(
  fromFull: string,
  toFull: string,
  dryRun: boolean
): Promise<"renamed" | "skipped_conflict" | "missing" | "error"> {
  if (dryRun) return "renamed";
  if (!validatePath(fromFull) || !validatePath(toFull)) return "error";
  if (!(await exists(fromFull))) return "missing";
  if (await exists(toFull)) return "skipped_conflict";
  try {
    await fs.promises.rename(fromFull, toFull);
    return "renamed";
  } catch (err: unknown) {
    console.error(
      `Error rename ${fromFull} → ${toFull}:`,
      (err as Error).message
    );
    return "error";
  }
}

async function moveFile(
  fromFull: string,
  toFull: string,
  dryRun: boolean,
  overwrite: boolean
): Promise<"moved" | "skipped_conflict" | "missing" | "error"> {
  if (dryRun) return "moved";
  if (!validatePath(fromFull) || !validatePath(toFull)) return "error";
  if (!(await exists(fromFull))) return "missing";
  if (await exists(toFull)) {
    if (overwrite) {
      try {
        await fs.promises.unlink(toFull);
        await ensureDir(path.dirname(toFull));
        await fs.promises.rename(fromFull, toFull);
        return "moved";
      } catch (err: unknown) {
        console.error(
          `Error move (overwrite) ${fromFull} → ${toFull}:`,
          (err as Error).message
        );
        return "error";
      }
    }
    return "skipped_conflict";
  }
  try {
    await ensureDir(path.dirname(toFull));
    await fs.promises.rename(fromFull, toFull);
    return "moved";
  } catch (err: unknown) {
    console.error(
      `Error move ${fromFull} → ${toFull}:`,
      (err as Error).message
    );
    return "error";
  }
}

async function rmdirIfEmpty(
  fullPath: string,
  dryRun: boolean
): Promise<boolean> {
  if (dryRun) return true;
  try {
    if (await isEmptyDir(fullPath)) {
      await fs.promises.rmdir(fullPath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Recursively collect dirs with given names; relativePath uses / */
async function collectDirs(
  basePath: string,
  currentRel: string,
  names: string[],
  out: string[]
): Promise<void> {
  const full = toFull(basePath, currentRel);
  if (!(await exists(full))) return;
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(full, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const name = e.name;
    const childRel = currentRel ? `${currentRel}/${name}` : name;
    if (names.includes(name)) out.push(childRel);
    await collectDirs(basePath, childRel, names, out);
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const overwrite = process.argv.includes("--overwrite");
  const basePath = resolveSmbBasePath();

  console.log("=".repeat(60));
  console.log("SMB-only migration (no DB changes)");
  console.log("=".repeat(60));
  console.log(
    `Mode: ${dryRun ? "DRY RUN" : "LIVE"}${overwrite ? " (overwrite existing)" : ""}`
  );
  console.log(`SMB Base Path: ${basePath}\n`);

  let foldersRenamed = 0;
  let filesMoved = 0;
  let skippedConflict = 0;
  let errors = 0;

  // Step 1: Rename "Documents" → "ISO_documents"
  console.log("Step 1: Renaming 'Documents' → 'ISO_documents'...");
  const documentsDirs: string[] = [];
  await collectDirs(basePath, "", ["Documents"], documentsDirs);
  for (const rel of documentsDirs) {
    const parentRel = path.dirname(rel).replace(/\\/g, "/");
    const newRel = parentRel ? `${parentRel}/ISO_documents` : "ISO_documents";
    const fromFull = toFull(basePath, rel);
    const toFullPath = toFull(basePath, newRel);
    console.log(`  ${rel} → ${newRel}`);
    const r = await renameDir(fromFull, toFullPath, dryRun);
    if (r === "renamed") foldersRenamed++;
    else if (r === "error") errors++;
  }
  console.log(`  ✓ Renamed ${foldersRenamed} folders\n`);

  // Step 2: Rename "delete files"/"Deleted files" → "Delete_files"
  console.log(
    "Step 2: Renaming 'delete files'/'Deleted files' → 'Delete_files'..."
  );
  const deleteDirs: string[] = [];
  await collectDirs(
    basePath,
    "",
    ["delete files", "Deleted files", "Delete files"],
    deleteDirs
  );
  let step2Count = 0;
  for (const rel of deleteDirs) {
    const parentRel = path.dirname(rel).replace(/\\/g, "/");
    const newRel = parentRel ? `${parentRel}/Delete_files` : "Delete_files";
    const fromFull = toFull(basePath, rel);
    const toFullPath = toFull(basePath, newRel);
    console.log(`  ${rel} → ${newRel}`);
    const r = await renameDir(fromFull, toFullPath, dryRun);
    if (r === "renamed") {
      step2Count++;
      foldersRenamed++;
    } else if (r === "error") errors++;
  }
  console.log(`  ✓ Renamed ${step2Count} Delete_files folders\n`);

  // Step 3: Move contents of "current" to parent (deepest first)
  console.log("Step 3: Moving files from 'current' to section root...");
  const currentDirs: string[] = [];
  await collectDirs(basePath, "", ["current"], currentDirs);
  currentDirs.sort((a, b) => b.length - a.length); // deepest first

  for (const currentRel of currentDirs) {
    const parentRel = path.dirname(currentRel).replace(/\\/g, "/");
    const currentFull = toFull(basePath, currentRel);
    if (!(await exists(currentFull))) continue;

    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(currentFull, { withFileTypes: true });
    } catch {
      errors++;
      continue;
    }

    for (const e of entries) {
      const name = e.name;
      const childFull = path.join(currentFull, name);
      const destRel = parentRel ? `${parentRel}/${name}` : name;
      const destFull = toFull(basePath, destRel);

      if (e.isFile()) {
        console.log(`  Moving: ${currentRel}/${name} → ${destRel}`);
        const r = await moveFile(childFull, destFull, dryRun, overwrite);
        if (r === "moved") filesMoved++;
        else if (r === "skipped_conflict") skippedConflict++;
        else if (r === "error") errors++;
      } else if (e.isDirectory()) {
        if (name === "versions") {
          // Merge current/versions/<uuid>/* into parent/versions/<uuid>/
          let uuidDirs: fs.Dirent[];
          try {
            uuidDirs = await fs.promises.readdir(childFull, {
              withFileTypes: true,
            });
          } catch {
            continue;
          }
          for (const uuidEnt of uuidDirs) {
            if (!uuidEnt.isDirectory()) continue;
            const uuidFull = path.join(childFull, uuidEnt.name);
            let files: fs.Dirent[];
            try {
              files = await fs.promises.readdir(uuidFull, {
                withFileTypes: true,
              });
            } catch {
              continue;
            }
            for (const f of files) {
              if (!f.isFile()) continue;
              const subPath = path.join(uuidFull, f.name);
              const subDest = parentRel
                ? `${parentRel}/versions/${uuidEnt.name}/${f.name}`
                : `versions/${uuidEnt.name}/${f.name}`;
              const subDestFull = toFull(basePath, subDest);
              console.log(
                `  Moving: ${currentRel}/versions/${uuidEnt.name}/${f.name} → ${subDest}`
              );
              const r = await moveFile(subPath, subDestFull, dryRun, overwrite);
              if (r === "moved") filesMoved++;
              else if (r === "skipped_conflict") skippedConflict++;
              else if (r === "error") errors++;
            }
            await rmdirIfEmpty(uuidFull, dryRun);
          }
          await rmdirIfEmpty(childFull, dryRun);
        } else if (name === "current") {
          // Nested current: move files to parent; merge versions into parent/versions
          let nested: fs.Dirent[];
          try {
            nested = await fs.promises.readdir(childFull, {
              withFileTypes: true,
            });
          } catch {
            continue;
          }
          for (const n of nested) {
            const src = path.join(childFull, n.name);
            if (n.isFile()) {
              const dRel = parentRel ? `${parentRel}/${n.name}` : n.name;
              const dFull = toFull(basePath, dRel);
              console.log(
                `  Moving: ${currentRel}/current/${n.name} → ${dRel}`
              );
              const r = await moveFile(src, dFull, dryRun, overwrite);
              if (r === "moved") filesMoved++;
              else if (r === "skipped_conflict") skippedConflict++;
              else if (r === "error") errors++;
            } else if (n.isDirectory() && n.name === "versions") {
              let uuidDirs: fs.Dirent[];
              try {
                uuidDirs = await fs.promises.readdir(src, {
                  withFileTypes: true,
                });
              } catch {
                continue;
              }
              for (const uuidEnt of uuidDirs) {
                if (!uuidEnt.isDirectory()) continue;
                const uuidFull = path.join(src, uuidEnt.name);
                let files: fs.Dirent[];
                try {
                  files = await fs.promises.readdir(uuidFull, {
                    withFileTypes: true,
                  });
                } catch {
                  continue;
                }
                for (const f of files) {
                  if (!f.isFile()) continue;
                  const subPath = path.join(uuidFull, f.name);
                  const subDest = parentRel
                    ? `${parentRel}/versions/${uuidEnt.name}/${f.name}`
                    : `versions/${uuidEnt.name}/${f.name}`;
                  const subDestFull = toFull(basePath, subDest);
                  console.log(
                    `  Moving: ${currentRel}/current/versions/${uuidEnt.name}/${f.name} → ${subDest}`
                  );
                  const r = await moveFile(
                    subPath,
                    subDestFull,
                    dryRun,
                    overwrite
                  );
                  if (r === "moved") filesMoved++;
                  else if (r === "skipped_conflict") skippedConflict++;
                  else if (r === "error") errors++;
                }
                await rmdirIfEmpty(uuidFull, dryRun);
              }
              await rmdirIfEmpty(src, dryRun);
            }
          }
          await rmdirIfEmpty(childFull, dryRun);
        }
      }
    }

    await rmdirIfEmpty(currentFull, dryRun);
  }
  if (skippedConflict > 0) {
    console.log(
      `  (Skipped ${skippedConflict} — destination already exists; use --overwrite to replace.)`
    );
  }
  console.log(`  ✓ Moved ${filesMoved} files\n`);

  // Step 4: Remove remaining empty "current" dirs
  console.log("Step 4: Removing empty 'current' folders...");
  const currentDirs2: string[] = [];
  await collectDirs(basePath, "", ["current"], currentDirs2);
  currentDirs2.sort((a, b) => b.length - a.length);
  let removed = 0;
  for (const rel of currentDirs2) {
    const full = toFull(basePath, rel);
    if (await isEmptyDir(full)) {
      console.log(`  Removing: ${rel}`);
      if (await rmdirIfEmpty(full, dryRun)) removed++;
    }
  }
  console.log(`  ✓ Removed ${removed} empty folders\n`);

  // Step 5: Unify "version" (singular) → "versions" (merge or rename)
  console.log("Step 5: Unifying 'version' → 'versions'...");
  const versionDirs: string[] = [];
  await collectDirs(basePath, "", ["version"], versionDirs);
  let step5Renamed = 0;
  let step5Merged = 0;
  for (const versionRel of versionDirs) {
    const parentRel = path.dirname(versionRel).replace(/\\/g, "/");
    const versionsRel = parentRel ? `${parentRel}/versions` : "versions";
    const versionFull = toFull(basePath, versionRel);
    const versionsFull = toFull(basePath, versionsRel);
    if (!(await exists(versionFull))) continue;
    if (await exists(versionsFull)) {
      // Merge version/<uuid>/* into versions/<uuid>/*
      let uuidDirs: fs.Dirent[];
      try {
        uuidDirs = await fs.promises.readdir(versionFull, {
          withFileTypes: true,
        });
      } catch {
        continue;
      }
      for (const uuidEnt of uuidDirs) {
        if (!uuidEnt.isDirectory()) continue;
        const uuidFull = path.join(versionFull, uuidEnt.name);
        let files: fs.Dirent[];
        try {
          files = await fs.promises.readdir(uuidFull, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const f of files) {
          if (!f.isFile()) continue;
          const subPath = path.join(uuidFull, f.name);
          const subDest = parentRel
            ? `${parentRel}/versions/${uuidEnt.name}/${f.name}`
            : `versions/${uuidEnt.name}/${f.name}`;
          const subDestFull = toFull(basePath, subDest);
          console.log(
            `  Moving: ${versionRel}/${uuidEnt.name}/${f.name} → ${subDest}`
          );
          const r = await moveFile(subPath, subDestFull, dryRun, overwrite);
          if (r === "moved") {
            filesMoved++;
            step5Merged++;
          } else if (r === "skipped_conflict") skippedConflict++;
          else if (r === "error") errors++;
        }
        await rmdirIfEmpty(uuidFull, dryRun);
      }
      await rmdirIfEmpty(versionFull, dryRun);
    } else {
      // Rename version → versions
      console.log(`  ${versionRel} → ${versionsRel}`);
      const r = await renameDir(versionFull, versionsFull, dryRun);
      if (r === "renamed") {
        foldersRenamed++;
        step5Renamed++;
      } else if (r === "error") errors++;
    }
  }
  console.log(
    `  ✓ Renamed ${step5Renamed} folder(s), merged ${step5Merged} file(s) into existing 'versions'\n`
  );

  // Step 6: Ensure each department has 4 section folders (KPI, ISO_documents, Maintenance, Delete_files)
  const SECTION_FOLDERS = [
    "KPI",
    "ISO_documents",
    "Maintenance",
    "Delete_files",
  ];
  console.log(
    "Step 6: Ensuring each department has KPI, ISO_documents, Maintenance, Delete_files..."
  );
  let step6Created = 0;
  let departmentDirs: fs.Dirent[];
  try {
    departmentDirs = await fs.promises.readdir(basePath, {
      withFileTypes: true,
    });
  } catch {
    departmentDirs = [];
  }
  for (const dept of departmentDirs) {
    if (!dept.isDirectory()) continue;
    const deptRel = dept.name;
    for (const section of SECTION_FOLDERS) {
      const sectionRel = `${deptRel}/${section}`;
      const sectionFull = toFull(basePath, sectionRel);
      if (await exists(sectionFull)) continue;
      console.log(`  Creating: ${sectionRel}`);
      if (!dryRun) await ensureDir(sectionFull);
      step6Created++;
    }
  }
  console.log(`  ✓ Created ${step6Created} missing folder(s)\n`);

  console.log("=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));
  console.log(`Folders renamed: ${foldersRenamed}`);
  console.log(`Files moved: ${filesMoved}`);
  if (skippedConflict > 0)
    console.log(`Skipped (dest exists): ${skippedConflict}`);
  console.log(`Errors: ${errors}`);
  if (dryRun) {
    console.log(
      "\n⚠️  DRY RUN. No changes were made. Run without --dry-run to apply."
    );
  } else {
    console.log("\n✅ SMB migration completed.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
