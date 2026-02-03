# Phase 02 – Code Review Report

**Scope:** Frontend implementation per [phase-02-frontend-department-selector-and-documents-only-picker.md](../phase-02-frontend-department-selector-and-documents-only-picker.md)  
**Checked against:** `./docs/code-standards.md`

---

## Summary

Phase 02 adds: (1) upload department selection for all users (including admin) on the documents page, with a dropdown when the user has more than one department; (2) FolderPickerDialog in "documents only" mode that loads the tree by `departmentId` and shows only the Documents (ISO_documents) folder; (3) i18n for new labels. Implementation reuses existing components, uses `useMemo`/`useEffect` for derived state, and keeps list/browse behaviour unchanged. Aligns with code standards (naming, structure, TypeScript).

---

## Critical Issues

**None.** No blocking or security-critical defects.

---

## Suggestions

### 1. Backend validation of upload folder (optional)

Phase Success Criteria mention: _"Optional: backend validates folder on upload and rejects if not under ISO_documents"_. Currently the backend validates that the folder belongs to the user’s departments (or admin); it does not enforce that the folder is under ISO_documents.

- **Suggestion:** If you want to enforce "upload only to Documents" on the server, add a check in the document upload flow (e.g. folder path contains `/ISO_documents`) and return 403 when the folder is outside that section.
- **Priority:** Low (frontend already restricts choice; this is defence in depth).

### 2. Disable Upload when no department

When `uploadDepartments.length === 0`, the user can still click Upload; `handleFileSelect` then shows a toast and does not open the picker. UX can be clearer by disabling the Upload button when there is no department (e.g. `disabled={uploadDepartments.length === 0}`), so the constraint is visible before click.

- **Priority:** Low.

### 3. `findDocumentsFolderNode` and path edge cases

`findDocumentsFolderNode` matches `path.endsWith("/ISO_documents")` or `path === "ISO_documents"` or `name === "ISO_documents"`. If the backend ever uses a different casing or path shape (e.g. `iso_documents`), the node would not be found. Consider normalising (e.g. `path.toLowerCase().endsWith("/iso_documents")`) or documenting that backend must use exactly `ISO_documents`.

- **Priority:** Low.

### 4. Auto-select effect dependency

In FolderPickerDialog, the effect that auto-selects the single folder when `documentsOnly && folders.length === 1` depends on `selectedFolderId`. That can cause the effect to run again after the user clears selection. Behaviour is still correct (it re-selects), but the dependency could be simplified (e.g. run only when `folders` change from empty to one node) if you want to avoid redundant updates.

- **Priority:** Very low.

---

## Positive Feedback

- **Requirements:** Everyone (including admin) selects department for upload; multi-dept gets dropdown; single-dept gets default; picker shows only Documents folder; list/browse unchanged.
- **State:** `uploadDepartments` derived with `useMemo`; `selectedDepartmentIdForUpload` synced with `useEffect` when `uploadDepartments` changes (default first, keep current if still in list).
- **FolderPickerDialog:** Clear `documentsOnly` + `departmentId` contract; when `documentsOnly && !departmentId` no load; pure `findDocumentsFolderNode` for tree filtering; display name from i18n (`upload.documentsFolder`); auto-select when a single folder is shown.
- **DocumentToolbar:** Optional upload-department props; dropdown only when `uploadDepartments.length > 1`; label from i18n (`uploadToDepartment`).
- **i18n:** New keys in en/vi/zh for toolbar.uploadToDepartment, upload.documentsFolder, upload.noDepartment, upload.selectDepartment.
- **Code standards:** File naming, component structure, interfaces for props, explicit types, use of existing hooks and helpers (`getUserDepartments`, `canSeeAllFolders`).

---

## Security

- **departmentId:** Comes from frontend state derived from `departments` (admin: all; others: filtered by `getUserDepartments`). Backend tree endpoint (Phase 01) validates department access; tree and upload are therefore constrained to allowed departments.
- **folderId on upload:** Backend document upload already checks folder access (user’s departments or admin). No new risk from Phase 02; optional hardening is to require folder under ISO_documents on the server (see Suggestion 1).

---

## Performance

- **uploadDepartments:** `useMemo` with `[user, departments]`; recomputes only when user or departments list changes.
- **Tree load:** Single GET when the picker opens with `departmentId`; filtering to Documents node is in-memory on a small tree. No concern.
- **Effect sync:** `selectedDepartmentIdForUpload` sync runs when `uploadDepartments` changes; O(n) with small n (number of departments). Acceptable.

---

## Checklist vs phase doc

| Requirement                            | Status                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Everyone selects department for upload | Done (uploadDepartments + selectedDepartmentIdForUpload)                 |
| Multi-dept: department selector        | Done (toolbar dropdown when > 1)                                         |
| Single-dept: default, no selector      | Done (useEffect default, dropdown only if > 1)                           |
| Picker: departmentId + Documents only  | Done (departmentId required when documentsOnly; findDocumentsFolderNode) |
| List/browse unchanged                  | Met (no change to document list or filters)                              |
| i18n for new labels                    | Done (en/vi/zh)                                                          |

---

**Conclusion:** Phase 02 implementation is solid and ready to merge. Optional improvements: disable Upload when no department, optional backend check for ISO_documents folder on upload, and minor path/effect refinements as above.

---

## Follow-up implementation (done)

All four suggestions were implemented:

1. **Backend validation of upload folder:** In `DocumentService.upload()`, after department access check, added validation that folder path is under ISO_documents: `normalizedPath.includes("/iso_documents") || normalizedPath === "iso_documents"` (case-insensitive). If not, throw 403 with `FOLDER_ACCESS_DENIED`. Updated `document.service.spec.ts`: `mockFolder.path` set to `"DEPT/ISO_documents"`; added test "should throw when folder path is not under ISO_documents" (folder path `DEPT/KPI` → 403).

2. **Disable Upload when no department:** In `DocumentToolbar`, the Upload button now has `disabled={uploadDepartments?.length === 0}` so the constraint is visible before click.

3. **findDocumentsFolderNode case-insensitive:** Path and name are compared in lowercase: `pathLower.endsWith("/iso_documents")`, `pathLower === "iso_documents"`, `nameLower === "iso_documents"`. Constant `ISO_DOCUMENTS_SECTION` set to `"iso_documents"` for consistency.

4. **Auto-select effect simplified:** Replaced dependency on `selectedFolderId` with a ref `lastAutoSelectFoldersLength`: when `documentsOnly && folders.length === 1` and ref !== 1, set selected folder and ref = 1; when `folders.length !== 1`, ref = 0. Ref is reset to 0 when dialog closes (`!open`) so auto-select runs again on next open.
