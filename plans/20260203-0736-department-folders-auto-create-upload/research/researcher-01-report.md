# Researcher 01 – Backend: Folder structure & ensure flow

**Plan:** 20260203-0736-department-folders-auto-create-upload  
**Focus:** When/how department folders are created; ensuring structure before tree load.

## Current behavior

- **FolderService.ensureDepartmentFolderStructure(departmentId)** (folder.service.ts ~436) creates per-department layout:
  - `{dept.code}` (root), `{dept.code}/KPI`, `{dept.code}/ISO_documents`, `{dept.code}/Maintenance`, `{dept.code}/Delete_files`
  - For KPI, ISO_documents, Maintenance: also creates `versions/` subfolder.
- **Callers:** Only **DepartmentService.create()** (department.service.ts ~81) calls it after creating a department. Existing departments created before this logic have **no** folders.
- **getTree(departmentId?, includeInternal)** (folder.service.ts ~265): Reads DB only; no ensure. If department has no folders → returns `[]` → UI shows "Không có thư mục nào".
- **KPI:** KpiAttachmentService calls ensureDepartmentFolderStructure before upload (kpi-attachment.service.ts ~105). ISO document upload has **no** equivalent ensure step.

## Key insights

1. **Gap:** Departments created before auto-create, or with failed ensure, have no folders. Tree load does not trigger ensure.
2. **Idempotency:** ensureDepartmentFolderStructure is idempotent (find or create; P2002 handled). Safe to call on every tree load for a department.
3. **ISO_documents:** Section name in DB/path is `ISO_documents` (not "Documents"). UI can still label it "Documents" for users.
4. **Existing API:** No dedicated "ensure department folders" endpoint. Options: (A) ensure inside getTree when departmentId is set and tree would be empty; (B) new POST /storage/folders/ensure-department/:id; (C) ensure in document upload flow when folderId is missing (current KPI pattern). For "no folder" fix, (A) or (B) preferred so picker always has tree.

## Recommendation

- **Ensure on tree load when departmentId present:** In FolderService.getTree(), when `departmentId` is provided, call ensureDepartmentFolderStructure(departmentId) once before building tree (or call from controller). Ensures any department has structure when user opens picker; tree no longer empty for valid department.
- **Alternative:** New endpoint POST /storage/folders/ensure-department/:departmentId; frontend calls it before GET tree when opening picker. Same effect; more explicit and testable.
- **Permissions:** ensureDepartmentFolderStructure does not check user; caller (controller) should enforce that only allowed users can trigger ensure for a department (e.g. user in that department or admin).

## Related code

- apps/api/src/modules/storage/services/folder.service.ts (ensureDepartmentFolderStructure, getTree)
- apps/api/src/modules/storage/controllers/folder.controller.ts (getTree)
- apps/api/src/modules/department/services/department.service.ts (create → ensure)
- apps/api/src/modules/kpi/services/kpi-attachment.service.ts (ensure before KPI upload)

## Unresolved

- Whether to ensure inside getTree (transparent) vs dedicated endpoint (explicit). Trade-off: getTree side-effect vs one extra round-trip from frontend.
