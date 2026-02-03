# Researcher 02 – Frontend: Department selector & Documents-only picker

**Plan:** 20260203-0736-department-folders-auto-create-upload  
**Focus:** Multi vs single department UX; restricting ISO upload to Documents folder only.

## Current behavior

- **Documents page** (apps/web/src/app/[locale]/dashboard/documents/page.tsx):
  - uploadFolderDepartmentId: if user is admin/dcc/boss → null (see all folders); else first department from getUserDepartments(user) (line ~72–76). So **multi-department users** currently see only **first** department in folder picker.
- **FolderPickerDialog** (folder-picker-dialog.tsx): Loads GET /storage/folders/tree?departmentId=... when departmentId prop set; else tree without filter. Shows full tree (all folders under department). User picks any folder + level → onSelect(folderId, levelId).
- **Upload flow:** User selects file → dialog opens → user picks folder + level → performUpload(file, folderId, levelId). No restriction to "Documents" section; user could pick KPI or Maintenance folder.

## Requirements (from task)

1. **Multi-dept user:** Choose department for upload (not only first one).
2. **Single-dept user:** Default upload to that department (no selector needed).
3. **ISO document upload:** Only upload to **Documents** (ISO_documents) folder of the chosen department.

## Key insights

1. **Department selector:** When user has >1 department, show department dropdown in upload flow (e.g. in FolderPickerDialog or documents page). When 1 department, skip selector and use that department. Admin/dcc/boss: can keep "all folders" or also restrict to Documents per department; product decision.
2. **Documents-only:** Two approaches:
   - **Picker restriction:** For ISO upload context, load only the Documents (ISO_documents) node(s) per department—e.g. API option ?section=ISO_documents or frontend filters tree to show only folders with path ending /ISO_documents. So user effectively picks "department → Documents folder" (one target per dept).
   - **Backend validation:** Allow current picker; in upload API validate folder.path contains "/ISO_documents" (and not /KPI, /Maintenance, /versions, /Delete_files). Reject with clear error if wrong section.
   - Recommendation: **Picker restriction** (show only Documents) for clearer UX; optional backend check as defense-in-depth.
3. **Ensure-before-tree:** If backend ensures structure when tree is loaded (or via ensure endpoint), frontend should call tree (or ensure then tree) so "Không có thư mục nào" disappears for departments that now get structure on first load.

## Implementation options

- **Option A – Department first, then Documents folder:** Open dialog → if multi-dept, select department → ensure (if endpoint) + load tree for that dept → show only Documents folder(s) (or tree filtered to ISO_documents). Single-dept: skip department step, same tree. Select "Documents" folder → level → confirm.
- **Option B – Current tree, filter nodes:** Load full tree per department; in UI hide KPI/Maintenance/Delete_files nodes so only department root and ISO_documents (and optionally its children) are selectable. Same outcome, more frontend filtering.
- **Option C – Backend "Documents folder" endpoint:** New GET /storage/folders/documents-by-department or similar returning one folder per department (the ISO_documents folder id). Picker shows department list → on select return that folder id. Simplest picker; backend must ensure structure before returning.

## Related code

- apps/web/src/app/[locale]/dashboard/documents/page.tsx (uploadFolderDepartmentId, handleFileSelect, FolderPickerDialog)
- apps/web/src/components/documents/folder-picker-dialog.tsx (loadFolders, FolderTree, onSelect)
- apps/web/src/components/documents/folder-tree.tsx (render tree)
- apps/web/src/lib/kpi-access-helpers.ts (getUserDepartments, canSeeAllFolders)

## Unresolved

- For admin/dcc/boss: allow picking any department + Documents only, or keep current "all folders" for ISO upload? Assumption: restrict everyone to Documents for ISO upload; admin still sees all departments.
