## Researcher 02 – Permissions & UI Visibility (Draft)

### Current Authorization Model (high level)

- Backend: **CASL-based RBAC + ABAC**.
  - Roles: `admin`, `boss`, `manager`, `editor`, `viewer`, plus department-specific roles.
  - Subjects: `Document`, `Folder`, `Kpi`, `Maintenance`, `Permission`, `all`, etc.
  - Abilities generated in `Authorization` module; enforced via `PoliciesGuard` on NestJS controllers.
- Frontend:
  - Hooks `useAbility`, `useCanAccess`, `usePages` + `PageGuard` to protect routes.
  - Sidebar and boss UI components filter actions based on `action + subject` permissions (e.g. `view Kpi`, `delete Document`).

### Folder Visibility Today

- Folder APIs:
  - `/storage/folders/tree`, `/storage/folders/tree/with-documents?departmentId=...` used for document browser + KPI boss UI.
  - Backend folder tree likely filters by folder/document permissions (inheritance, ABAC flags).
- UI:
  - Document browser sidebar shows a full per-department tree, including `Deleted files` and possibly `version`/`current` folders.
  - Boss KPI components (`department-kpi-status`, `kpi-list`, KPI page) fetch only root-level folder(s) via `/storage/folders/tree/with-documents`, previously using `folders[0].id` as upload folder id; latest changes tend to rely on backend auto-routing.

### New Visibility Requirement

- Under each department root: `KPI`, `Maintenance`, `Documents`, `Delete files`.
- Inside each: a `versions` subfolder.
- **Normal users**:
  - Must **not see** `versions` or `Delete files` anywhere in the tree (sidebar, folder pickers, etc.).
  - They interact only via higher-level flows (upload, view, delete, request deletion) that operate on canonical folders.
- **Admins (and possibly DCC)**:
  - Can browse full tree, including `versions` + `Delete files`.
  - Need specialist screens / tools for investigating versions and deletions.

### Proposed Permission + UI Strategy

1. **Mark internal folders**
   - At folder level, add attributes (in DB or inferred from `path`):
     - `isInternal` (true for `versions` and `Delete files`).
     - `internalType` (e.g. `VERSIONS`, `DELETE_FILES`).
   - `FolderService.ensureDepartmentFolderStructure()` can set these flags when creating/inflating the structure.

2. **Backend filtering of folder trees**
   - In folder tree queries (`FolderService.getTree`, `/storage/folders/tree*` controllers):
     - If current user **is not admin (and not DCC)**, filter out nodes where `isInternal = true`.
     - Keep document counts/permissions logic unchanged—these internal folders are just not serialized for regular users.
   - For admin (and optionally DCC): return full tree.

3. **Frontend alignment**
   - Document browser and KPI-related UIs should **never rely on raw path names** like `current` or `versions`.
   - They should either:
     - Rely purely on **backend-chosen folderId** (e.g. KPI upload uses `folderStructure.kpiCurrent` and ignores any client folderId); or
     - Use folder tree only for user-facing sections (`KPI`, `Documents`, `Maintenance`) while letting backend resolve internal targets.
   - Boss UI:
     - Already changed to avoid binding KPI uploads to arbitrary folderId; backend can enforce canonical location.
     - For future admin-only views (e.g. “Deleted files” browser, version explorer), wrap pages in `PageGuard` with appropriate `manage`/`view` abilities and dedicated routes.

4. **Explicit role conditions**
   - Backend:
     - Ability factory should grant `view/manage` of internal folders and `Document` entities under them only to `admin` (and `dcc` if required).
     - For regular users, internal folders are either not visible at all or considered out of scope via ABAC conditions.
   - Frontend:
     - Navigation: hide any links to “Deleted files” or “Versions” screens if user lacks `manage Folder`/`manage Document` on those resources.
     - In boss UI, ensure status dashboards use **KPI records and attachments**, not direct folder traversal.

### Migration & Compatibility Concerns

- Existing explicit folder permissions might include `Deleted files` / `version` paths; when adding `isInternal`, we should either:
  - Keep those permissions but simply filter them from non-admin users; or
  - Migrate them to new semantics if we rename folders or change structure.
- Any direct links/bookmarks to SMB paths must be reviewed if the physical layout changes (covered in storage phase).

Unresolved questions:

- Which roles beyond `admin` (e.g. `DCC`, `boss`) should see `versions` and `Delete files`?
- Should boss users keep a read-only view of deletions/versions, or is that strictly an admin/DCC responsibility?
