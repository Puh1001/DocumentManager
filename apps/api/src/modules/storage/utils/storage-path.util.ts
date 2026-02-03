import { Logger } from "@nestjs/common";

/**
 * Storage sections used for per-department layout.
 *
 * - KPI:        Department KPI attachments and related docs
 * - ISO_documents: General ISO documents
 * - Maintenance: Maintenance notices / docs
 * - Delete files: Admin-only archive area
 */
export type StorageSection =
  | "KPI"
  | "ISO_documents"
  | "Maintenance"
  | "Delete_files";

/**
 * Canonical path builder for SMB storage.
 *
 * This is the single place that knows how to map logical concepts
 * (section root, current file, versions) to physical relative paths.
 *
 * Goals:
 * - Hide legacy layouts such as `{Section}/current` from business logic
 * - Make it trivial to switch layouts in future phases
 * - Prevent scattered string concatenation of `current/` and `versions/`
 */
export class StoragePathBuilder {
  private static readonly logger = new Logger(StoragePathBuilder.name);

  /**
   * Derive the canonical section root path from a persisted folder path.
   *
   * Backward compatibility:
   * - Existing data may still use `{dept}/{Section}/current` or even
   *   `{dept}/{Section}/current/current` (legacy sync bugs).
   * - New layout wants section root to be `{dept}/{Section}` with
   *   current files stored directly under this folder and versions
   *   under `versions/{documentId}/...`.
   *
   * Examples:
   * - "DH/ISO_documents"             -> "DH/ISO_documents"
   * - "DH/ISO_documents/current"     -> "DH/ISO_documents"
   * - "DH/KPI/current"               -> "DH/KPI"
   * - "DH/KPI/current/current"       -> "DH/KPI"
   */
  static deriveSectionRootFromFolderPath(folderPath: string): string {
    if (!folderPath) {
      return "";
    }

    // Normalize to forward slashes for consistency
    let base = folderPath.replace(/\\/g, "/");

    // Strip any trailing "/current" segments (handles legacy and bad data)
    while (base.endsWith("/current")) {
      base = base.replace(/\/current$/, "");
    }

    // Collapse duplicate slashes just in case
    base = base.replace(/\/+/g, "/");

    if (!base) {
      this.logger.warn(
        `deriveSectionRootFromFolderPath produced empty base from folderPath="${folderPath}"`,
      );
    }

    return base;
  }

  /**
   * Build canonical path for the "current" physical file for a document.
   *
   * New layout:
   * - Current files live directly under the section root:
   *   "{dept}/{Section}/{documentId}{ext}"
   */
  static buildCurrentFilePath(
    sectionRootPath: string,
    documentId: string,
    ext: string,
  ): string {
    const safeRoot = sectionRootPath.replace(/\\/g, "/").replace(/\/+$/, "");
    return `${safeRoot}/${documentId}${ext}`;
  }

  /**
   * Build canonical path for a version file under the section's versions tree.
   *
   * New layout:
   * - Versions live under:
   *   "{dept}/{Section}/versions/{documentId}/vNNN_timestamp_user.ext"
   */
  static buildVersionFilePath(
    sectionRootPath: string,
    documentId: string,
    version: number,
    userId: string,
    ext: string,
    timestampIsoString?: string,
  ): string {
    const safeRoot = sectionRootPath.replace(/\\/g, "/").replace(/\/+$/, "");
    const timestamp =
      timestampIsoString ??
      new Date()
        .toISOString()
        // Keep same timestamp format as other parts of the system
        .replace(/[:.]/g, "-");

    const versionFileName = `v${String(version).padStart(
      3,
      "0",
    )}_${timestamp}_${userId.slice(0, 8)}${ext}`;

    return `${safeRoot}/versions/${documentId}/${versionFileName}`;
  }
}
