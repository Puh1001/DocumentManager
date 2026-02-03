# Phase 02: Frontend – Department selector & Documents-only folder picker

**Plan:** [plan.md](./plan.md)  
**Decisions:** [reports/decisions-and-requirements.md](./reports/decisions-and-requirements.md)  
**Dependencies:** Phase 01 (tree returns folders after ensure)

## Overview

- **Date:** 2026-02-03
- **Priority:** High
- **Implementation status:** Done
- **Review status:** Done ([report](./reports/phase-02-code-review.md))
- **Description:** (1) Multi-department users choose department for ISO upload; single-department users default to that department. (2) ISO document upload only allows selecting the **Documents** (ISO_documents) folder of the chosen department.

## Key Insights

- Today: uploadFolderDepartmentId = first department for non-admin users → multi-dept users only see first department. Need department selector when user has >1 department.
- Section for ISO documents in backend is **ISO_documents** (path e.g. CONG_NGHE/ISO_documents). UI can label it "Documents".
- Restrict picker to Documents: either filter tree to only ISO_documents nodes, or new API that returns only Documents folder per department (simplest: one folder per dept for ISO upload).

## Requirements

### Functional

- **Everyone (including admin):** When uploading from ISO documents page, **must select department**. Upload goes to **Documents** (ISO_documents) folder of that department. Admin **view** permission unchanged (can still view/download files from all folders).
- **Multi-department user:** Show department selector (dropdown or step). After selecting department, load tree for that department; show only **Documents** folder (ISO_documents) of that department.
- **Single-department user:** Default to user’s only department; optionally hide department selector. Load tree for that department; show only Documents folder for ISO upload.
- **Admin/dcc/boss:** Same as everyone: select department for upload; picker shows only Documents folder of selected department. No special “all folders” for upload. View/list: unchanged (admin still sees documents from all folders).
- **List/browse:** **No change.** Document list still shows files from all folders (filters, department filter, etc. as today). Only the **upload** action from ISO documents page is restricted to Documents folder of selected department.
- **Picker result:** User selects (department, Documents folder id, level). Upload uses that folder id and level.

### Non-functional

- Reuse existing FolderPickerDialog where possible; extend with department selector and Documents-only filtering.
- i18n: labels for "Documents", "Select department", etc.

## Architecture

- **Documents page:** For **all users (including admin)** – when opening upload picker, determine departments: admin/dcc/boss get all departments (or from API); others get getUserDepartments(user). If length > 1, show department selector; if length === 1, default to that department. Pass selected departmentId to FolderPickerDialog. **Document list:** unchanged (still shows documents from all folders).
- **FolderPickerDialog:** Accept `departmentId` (required for ISO upload). Load GET /storage/folders/tree?departmentId=... (Phase 01 ensures structure). Filter tree to only show the **Documents** (ISO_documents) node: either backend query param e.g. `?departmentId=...&section=ISO_documents` returning only that subtree, or frontend filter nodes where path ends with `/ISO_documents` or contains `/ISO_documents` and exclude siblings (KPI, Maintenance, Delete_files). User selects that folder + level → onSelect(folderId, levelId).
- **Alternative (simpler):** New GET /storage/folders/documents-folder?departmentId=... returning single folder (ISO_documents) for that department; backend ensures structure and returns folder id. Picker then shows only level selector + “Upload to Documents of {department name}”. Less flexible (e.g. no subfolders under Documents) but matches “upload into Documents of department”.

## Related Code Files

- **Modify:** `apps/web/src/app/[locale]/dashboard/documents/page.tsx` – department state when multi-dept; pass selected departmentId to FolderPickerDialog; optional department dropdown in toolbar or inside dialog.
- **Modify:** `apps/web/src/components/documents/folder-picker-dialog.tsx` – accept departmentId; load tree; filter tree to Documents (ISO_documents) only, or call new documents-folder endpoint and show simplified UI (department + level).
- **Optional modify:** `apps/web/src/components/documents/folder-tree.tsx` – support filtered list (single folder or subtree) instead of full tree.
- **Reference:** `apps/web/src/lib/kpi-access-helpers.ts` (getUserDepartments, canSeeAllFolders).

## Implementation Steps

1. **Documents page:** Compute user departments (getUserDepartments). If >1, add state for selectedDepartmentId (default first). If 1, set selectedDepartmentId to that id. When opening folder picker for upload, pass selectedDepartmentId to FolderPickerDialog. If multi-dept, show department dropdown (in page or dialog) and set selectedDepartmentId on change.
2. **FolderPickerDialog:** Require departmentId for ISO upload flow. On open, load tree with that departmentId. Filter tree to only the ISO_documents folder: either backend supports section=ISO_documents and returns only that branch, or frontend filters: keep only nodes whose path matches `.../ISO_documents` or is the direct child of that path. Show level selector; on confirm, onSelect(folderId, levelId) where folderId is the Documents folder (or chosen subfolder under it if allowed).
3. **Backend (optional):** Add GET /storage/folders/documents-folder?departmentId=... that ensures structure, then returns the ISO_documents folder for that department (id, name, path). Simplifies picker to “department + level” only.
4. **i18n:** Add keys for "Documents", "Select department", "Upload to Documents of {name}" if needed.

## Todo List

- [x] Documents page: department state and selector for multi-dept users
- [x] FolderPickerDialog: accept departmentId; load tree; filter to Documents (ISO_documents) only (frontend filter)
- [ ] Optional: new GET /storage/folders/documents-folder?departmentId=... (not implemented)
- [x] i18n for new labels (upload.documentsFolder, upload.noDepartment, upload.selectDepartment, toolbar.uploadToDepartment)
- [x] Ensure single-dept user path: no department selector, default departmentId (useEffect sync)

## Success Criteria

- Multi-dept user can select department then see only Documents folder(s) for that department and complete upload.
- Single-dept user sees only their department’s Documents folder(s) without extra selector.
- Upload target is always under ISO_documents (path contains /ISO_documents). Optional: backend validates folder on upload and rejects if not under ISO_documents.

## Risk Assessment

- **Admin/dcc/boss:** Locked – everyone (including admin) selects department for upload; upload goes to Documents folder of that department. **View** unchanged (admin still sees all documents). No special “all folders” for upload.

## Security Considerations

- departmentId passed to tree/documents-folder must be validated on backend (user in that department or admin/dcc/boss). Phase 01/controller should enforce.

## Next Steps

- Phase 03: Testing and docs.
