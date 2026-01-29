## Researcher 01 – Storage Layout & Versioning (Draft)

### Current Behavior (from docs + code)

- **Per-department root**: `{department.code}` (e.g. `KT`, `CN_HUNG_YEN_DET_DAI`).
- **Subfolders created by `FolderService.ensureDepartmentFolderStructure()`**:
  - `{dept}/KPI`
  - `{dept}/Documents`
  - `{dept}/Maintenance`
  - `{dept}/Deleted files`
  - For KPI/Documents/Maintenance: `current` and `version` subfolders are auto-created.
- **VersionService** currently writes:
  - `baseFolderPath` derived from `document.folder.path` (recently normalised to strip repeated `/current`).
  - Current file: `{baseFolderPath}/current/{document.id}{ext}`
  - Version file: `{baseFolderPath}/version/{document.id}/vNNN_timestamp_user.ext`
- **Deletion workflow**:
  - Uses `DocumentDeletionService` and a department-level `"Deleted files"` folder.
  - Documents are soft-deleted and moved to `{dept}/Deleted files/...`, while `version/` holds version history.
- **KPI attachments**:
  - `KpiAttachmentService.uploadAttachment` now always resolves canonical `folderStructure.kpiCurrent` and delegates to `DocumentService.upload` (which uses `VersionService` under the hood).

### Target Layout (per requirement)

- Per department root: `{dept}`.
- Fixed four direct children:
  - `KPI/`
  - `Maintenance/`
  - `Documents/`
  - `Delete files/`
- Inside each of these four:
  - **Current files live directly in that folder** (no `current/` subfolder).
  - A single `versions/` subfolder is used for all historical versions for that section.
- Deletion rule (per request):
  - When a file is deleted (user or DCC), it is **removed from main folder** and its previous/current copy is moved into the corresponding `versions/` folder.
  - `Delete files/` becomes a purely admin-facing area (can be used for hard-deleted or archived docs, but hidden from normal users).

### Constraints & Risks

- **File system sync** (`FolderSyncService` + watcher):
  - Currently expects `current/` + `version/` hierarchies and per-document subfolders; changing this requires sync logic updates and careful backfill.
- **Checksum/version semantics**:
  - `VersionService` assumes one “current” file per document and many version records; new layout must still guarantee a stable mapping between `Document` + `DocumentVersion` and physical paths.
- **Existing data**:
  - Many departments already have `KPI/current` and `{dept}/Deleted files`; migrating all to flat folders with `versions/` will require filesystem moves and DB `filePath` updates.
- **Concurrency**:
  - Race conditions during folder creation and version writes are already mitigated via unique constraints; migration and new layout must respect those safeguards.

### Candidate Strategies

#### Strategy A – Minimal change (keep current/version semantics)

- Keep current behaviour (per-dept `{section}/current` + `version/{documentId}/...`) but **treat `current` as implementation detail**:
  - SMB structure unchanged; UI labels and documentation present it as “KPI” with hidden “current”.
  - `Delete files/` continues to hold soft-deleted docs; version history stays in `version/{documentId}`.
- Pros:
  - Minimal code and migration changes (we are already close).
  - Sync and deletion workflows mostly untouched.
- Cons:
  - Does NOT fully match user’s desired physical layout (no single `versions/` per section).
  - Harder to reason about for admins directly browsing SMB.

#### Strategy B – Single `versions/` per section, per-doc subdirs

- New SMB layout per section:
  - Current: `{dept}/{Section}/{fileName or id.ext}`
  - Versions: `{dept}/{Section}/versions/{documentId}/vNNN_timestamp_user.ext`
  - Delete-files (optional): `{dept}/Delete files/{documentId}/...` (admin only).
- Implementation:
  - `VersionService`’s `currentPath` becomes `{sectionPath}/{document.id}{ext}`.
  - `versionPath` becomes `{sectionPath}/versions/{document.id}/vNNN_...`.
  - `FolderService` ensures `versions` subfolder for each section & drops `current`/`version` siblings.
- Pros:
  - Matches requirement closely while keeping per-document isolation in version folder.
  - Limited changes: primarily `ensureDepartmentFolderStructure`, `VersionService`, and sync mappings.
- Cons:
  - Requires full migration for all existing docs and versions.
  - Sync jobs and deletion logic must be carefully adjusted and regression-tested.

#### Strategy C – Flat `versions/` per section (no docId subfolder)

- Layout:
  - Current: `{dept}/{Section}/{document.id}{ext}` or `{dept}/{Section}/{safeName.ext}`.
  - Versions: `{dept}/{Section}/versions/{document.id}_vNNN_timestamp.ext` (flat list).
- Pros:
  - Conceptually closest to “one versions folder per section”.
  - Easier for admin to navigate SMB manually.
- Cons:
  - Potential for huge `versions/` directories with thousands of files → performance / manageability issues.
  - Naming collisions and filtering become more complex; version cleanup tooling must be robust.

### Recommended Direction (for planner)

- Prefer **Strategy B**:
  - Satisfies “versions under a single `versions` folder per section” at directory level while retaining per-document subdirectories for scalability.
  - Requires:
    - Updating folder creation to create `versions/` instead of `{current,version}` pairs.
    - Adjusting `VersionService` path construction.
    - Re-pointing deletion flows to move removed files into the same `versions/{documentId}` tree or into a re-purposed `Delete files/` structure, depending on business choice.
    - A dedicated migration script (filesystem + DB) and sync alignment.

Unresolved questions:

- Should `Delete files/` remain a separate tree (for hard-deleted/archived docs) or be fully replaced by the `versions/` mechanism?
- Are there external tools/users directly accessing SMB who depend on current `current/` + `version/` layout names?
