# Phase 01 – Code Review Report

**Scope:** Implementation of ensure-before-tree in `FolderService.getTree()` per [phase-01-backend-ensure-folder-on-tree-load.md](../phase-01-backend-ensure-folder-on-tree-load.md)  
**Checked against:** `./docs/code-standards.md`

---

## Summary

Phase 01 adds a call to `ensureDepartmentFolderStructure(departmentId)` at the start of `FolderService.getTree()` when `departmentId` is provided. Ensure is wrapped in try/catch so that on failure (e.g. SMB down) the method still returns the tree from existing DB state. Unit tests cover: ensure called when `departmentId` present, not called when absent, tree returned when ensure fails. Implementation matches the plan (Option A), follows YAGNI/KISS/DRY and existing error-handling patterns.

---

## Critical Issues

**None.** No blocking or security-critical defects found.

---

## Suggestions

### 1. Department access check (controller)

Phase Security Considerations state: _"backend should validate user can access that department"_. Currently the controller only uses `JwtAuthGuard`; any authenticated user can call `GET /storage/folders/tree?departmentId=<any-id>` and trigger ensure + tree for that department.

- **Suggestion:** Add a guard or in-controller check that the user is allowed to access the given `departmentId` (e.g. user’s departments or admin/dcc) before calling `getTree(departmentId)`. Same for `getTreeWithDocuments(departmentId)` if/when ensure is added there.
- **Priority:** Medium (defence in depth; tree data is filtered by department, but ensure has side effects).

### 2. Ensure on `getTreeWithDocuments` when `departmentId` is set

Ensure runs only in `getTree()`. The web app also calls `GET /storage/folders/tree/with-documents?departmentId=...` (e.g. boss documents list). For a department with no folders, that endpoint returns an empty tree and does not run ensure.

- **Suggestion:** Call `ensureDepartmentFolderStructure(departmentId)` at the start of `getTreeWithDocuments(departmentId?, includeInternal)` when `departmentId` is set, with the same try/catch and “log and continue” behavior as in `getTree()`, so both tree endpoints create the structure on first load.
- **Priority:** Low (phase scope was only `getTree`; can be done in a follow-up).

### 3. Logging

`console.error` is used for ensure failures. For production, consider a structured logger (e.g. Nest `Logger`) and log level (e.g. `warn`) so failures are easy to filter and monitor.

- **Priority:** Low.

---

## Positive Feedback

- **Option A implemented correctly:** Ensure runs inside `getTree()` when `departmentId` is set; no new endpoint; one round-trip.
- **Resilience:** Ensure failure does not break tree load; tree is still returned from DB; UI keeps working.
- **Idempotency:** Reuses existing `ensureDepartmentFolderStructure`; safe to call on every tree load.
- **Tests:** getTree behavior is well covered (ensure called/not called, fallback when ensure throws); `console.error` mocked in the failure test to avoid noise.
- **Code standards:** Naming (camelCase), structure (service layer, try/catch), and types align with `code-standards.md` and existing patterns.
- **findAll test fix:** Expectation updated to match implementation (`where` without `parentId` when not provided).

---

## Security

- **Input:** `departmentId` is passed to Prisma and to `ensureDepartmentFolderStructure`, which validates department existence via `findUnique`; invalid/non-existent id leads to not-found, not injection.
- **Gap:** No check that the current user is allowed to access that department; see Suggestion 1.

---

## Performance

- **Cost:** One extra call to `ensureDepartmentFolderStructure` per `getTree(departmentId)` request. Ensure is idempotent and typically does only DB lookups when structure already exists; SMB/DB writes only when creating missing folders.
- **Impact:** Acceptable for tree-load frequency; no change when `departmentId` is omitted.

---

## Checklist vs phase doc

| Requirement                                                           | Status                                            |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| Ensure when `GET /storage/folders/tree?departmentId=:id`              | Done in `getTree()`                               |
| Create structure if missing (reuse `ensureDepartmentFolderStructure`) | Done                                              |
| On ensure error: log and still return tree from DB                    | Done (try/catch, log, continue)                   |
| No breaking change to tree response                                   | Met                                               |
| Unit tests: ensure called / not called / fallback when ensure fails   | Done                                              |
| Access control for department                                         | Not in scope for Phase 01; suggested as follow-up |

---

**Conclusion:** Phase 01 implementation is solid and ready to merge. Recommended follow-ups: department access check on tree endpoints (medium), optional ensure in `getTreeWithDocuments` when `departmentId` is set (low), and structured logging for ensure failures (low).

---

## Follow-up implementation (done)

All three suggestions above were implemented:

1. **Department access check:** `FolderController` now injects `UsersService` and has a private `ensureDepartmentAccess(departmentId, req)` that throws 403 when the user is not admin/dcc/boss and not in the given department. It is called in `getTree` and `getTreeWithDocuments` when `departmentId` and `req.user` are present. Added `ErrorCodes.FOLDER.ACCESS_DENIED`. Controller spec: mocks for `FolderSyncGateway` and `UsersService`, and tests for admin allowed, user-in-dept allowed, user-not-in-dept denied (getTree and getTreeWithDocuments).

2. **Ensure on getTreeWithDocuments:** `FolderService.getTreeWithDocuments(departmentId?, includeInternal)` now calls `ensureDepartmentFolderStructure(departmentId)` at the start when `departmentId` is set, with the same try/catch and `logger.warn` on failure. Folder service spec: added `getTreeWithDocuments` tests (ensure called when departmentId set, not called when absent, tree returned when ensure fails).

3. **Logging:** `FolderService` uses Nest `Logger` (`private readonly logger = new Logger(FolderService.name)`). Ensure failures are logged with `this.logger.warn(...)`; getTree/getTreeWithDocuments outer errors with `this.logger.error(...)`. Removed `console.error` and the console mock from the “ensure fails” test in folder.service.spec.
