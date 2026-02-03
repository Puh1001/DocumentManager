# Phase 00: Upload Requirements — Code Review

**Scope:** Code touched by [phase-00-upload-requirements.md](../phase-00-upload-requirements.md)  
**Checked against:** `./docs/code-standards.md`  
**Date:** 2026-01-30

---

## Summary

Phase 00 adds a required document level to the upload flow, a document-levels API, and department-filtered folder picker for non-admin users. Implementation aligns with code standards (kebab-case files, PascalCase types, guards, DTOs). Two items need follow-up: a dedicated error code for invalid level, and backend validation that the chosen folder belongs to the user’s department when the user is restricted.

---

## Critical Issues (addressed)

### 1. Wrong error code for invalid/inactive level — FIXED

**Where:** `apps/api/src/modules/storage/services/document.service.ts` (lines 176–183)

**Issue:** When `levelId` is provided but invalid or inactive, the code throws with `ErrorCodes.DOCUMENT.FOLDER_REQUIRED`, which is misleading for clients and i18n.

**Recommendation:** Add a dedicated code and use it:

- In `apps/api/src/common/errors/error-codes.ts`, under `DOCUMENT`, add for example:
  - `INVALID_LEVEL: "document.upload.invalid_level"`
- In `document.service.ts`, use this code (and message like "Invalid or inactive document level") instead of `FOLDER_REQUIRED`.

### 2. No backend check that folder belongs to user’s department

**Where:** `document.service.upload()` and document upload endpoint

**Issue:** Phase 00 doc requires: “Ensure folder belongs to user’s department (backend validation)”. The frontend restricts the folder tree by `departmentId` for non-admin/dcc/boss users, but the API does not check that `folderId`’s folder has `departmentId` equal to one of the user’s departments. A user who can only see their department could still upload to another department’s folder if they know the folder ID.

**Recommendation:** In the upload flow (controller or service), for users that are not admin/dcc/boss, load the folder, then ensure `folder.departmentId` is in the current user’s departments (using existing user/department resolution). If not, throw a 403 or 400 with a clear error code/message. Implement in Phase 02 when access control is fully defined, or as a small follow-up if product agrees.

---

## Suggestions (addressed)

1. **DocumentLevelService / DocumentLevelController tests** — DONE  
   There are no unit tests for `document-level.service.ts` or `document-level.controller.ts`. Adding specs for `findAll(activeOnly)`, `findById`, and the GET endpoint would improve reliability and document behavior.

2. **Reset folder picker state on cancel** — DONE  
   In `folder-picker-dialog.tsx`, when the user closes the dialog via Cancel (or overlay), `selectedFolderId` and `selectedLevelId` are not reset. Re-opening shows the previous selection. Either document this as “remember last choice” or reset both when `open` becomes `false` (e.g. in a `useEffect` on `open`) for consistent “fresh” state each open.

3. **Level required in API** — DONE (UploadDocumentDto added with comment)  
   Phase 00 describes level as required for upload. Backend currently treats `levelId` as optional for backward compatibility. Consider adding a DTO with `@IsOptional()` now and a follow-up task to make `levelId` required (e.g. after a deprecation period) and enforce it in the controller/DTO.

4. **Type for document-levels API response** — DONE (level-selector treats response as array only)  
   Backend returns an array directly. Frontend already handles both array and `{ data: DocumentLevel[] }`. If the API contract is “always array”, you can simplify `level-selector.tsx` by removing the `(data as { data?: DocumentLevel[] }).data ?? []` branch once confirmed.

---

## Positive Feedback

- **Structure:** Clear split between DocumentLevel (service, controller, GET), Document (upload with `levelId`), and frontend (LevelSelector, FolderPickerDialog, page). Matches existing module patterns.
- **Naming & types:** kebab-case files, PascalCase components/interfaces, explicit props and API types; matches `code-standards.md`.
- **Guards & policies:** Document levels endpoint uses `JwtAuthGuard`, `PoliciesGuard`, and `@CheckPolicies({ action: "view", subject: "Document" })`; upload uses same guards. Consistent with codebase.
- **UX:** Level required in dialog; Select disabled until both folder and level are chosen; level names localized (nameEn / nameVi / nameZh with fallback to `name`).
- **Robustness:** LevelSelector uses a `cancelled` flag in `useEffect` to avoid state updates after unmount; handles both array and wrapped list for document-levels response.
- **Folder filtering:** `uploadFolderDepartmentId` and `canSeeAllFolders(roles)` correctly drive folder tree filtering (admin/dcc/boss see all; others see only their department). `FolderService.getTree(departmentId)` and controller `departmentId` query are used correctly.
- **Tests:** `document.service.spec.ts` updated with DocumentLevelService mock and `level: true` in findAll expectations; document service tests pass.

---

## Security

- **Auth:** Upload and document-levels endpoints are behind JWT + policy checks. No change needed for Phase 00.
- **Folder ownership:** Only gap is the missing server-side check that the upload folder belongs to the user’s department for restricted users (see Critical #2).

---

## Performance

- Document levels are fetched once per LevelSelector mount; list is small and read-only. No pagination needed.
- Folder tree is loaded when the dialog opens; department filter reduces payload for non-admin users. Acceptable for Phase 00.

---

## Conclusion

Phase 00 is in good shape and matches the plan and code standards. Address Critical #1 (error code for invalid level) soon; plan Critical #2 (folder–department check) for Phase 02 or a small follow-up. Optional: add DocumentLevel tests, clarify level-required in API over time, and decide folder-picker reset behavior.
