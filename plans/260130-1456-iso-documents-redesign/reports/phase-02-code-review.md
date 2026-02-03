# Phase 02: Backend API Updates — Code Review

**Scope:** Code touched by [phase-02-backend-api.md](../phase-02-backend-api.md)  
**Checked against:** `./docs/code-standards.md`  
**Date:** 2026-01-30

---

## Summary

Phase 02 adds ISO metadata support: required levelId on upload, UpdateIsoMetadataDto, PATCH iso-metadata, department-based filtering in findAll, level filter, and preparer/reviewer/approver relations in queries. DTOs, service, and controller align with code standards. One **critical** access-control bug (empty department list) was found and fixed. Remaining items are suggestions.

---

## Critical Issues

### 1. [FIXED] Empty `departmentIdsForFilter` bypassed access control

**Where:** `apps/api/src/modules/storage/services/document.service.ts` — `findAll()`

**Issue:** When a non-admin user had no departments (or `getUserDepartments` failed), the controller passed `departmentIdsForFilter: []`. The service only applied the folder filter when `filters?.departmentIdsForFilter?.length` was truthy, so for `[]` no folder filter was applied and **all documents** were returned.

**Fix applied:** Treat “access control applied” as “`departmentIdsForFilter` is defined” (including `[]`). When `departmentIdsForFilter !== undefined`:

- If user also passed `departmentId` and it is in `departmentIdsForFilter`, use that single department.
- Else if `departmentIdsForFilter.length > 0`, use `{ in: departmentIdsForFilter }`.
- Else use `{ in: [] }` so no documents match.

**Result:** Users with no departments (or failed department lookup) now get zero documents instead of all.

---

## Suggestions (addressed)

### 1. Document-level access for GET/PATCH by ID — DONE

**Where:** `document.controller.ts` — `findOne` (GET `:id`), `stream`, `download`, `updateIsoMetadata` (PATCH `:id/iso-metadata`)

**Done:** Added private `ensureDocumentDepartmentAccess(document, req)` that, for non-admin/dcc/boss, loads user departments and throws 403 if `document.folder.departmentId` is not in the list. Called after `findById` in findOne, stream, download, and updateIsoMetadata. Added `ErrorCodes.DOCUMENT.ACCESS_DENIED`.

### 2. Use `UpdateIsoMetadataDto` type in service — DONE

**Where:** `document.service.ts` — `updateIsoMetadata(id, dto, userId)`

**Done:** Imported `UpdateIsoMetadataDto` and use it as the `dto` parameter type.

### 3. Upload body validation — DONE

**Where:** `document.controller.ts` — `upload()`

**Done:** Fail-fast in controller: if `!folderId?.trim()` throw `FOLDER_REQUIRED`; if `!levelId?.trim()` throw `LEVEL_REQUIRED` before calling the service.

### 4. Audit log for ISO metadata updates — DONE

**Where:** `document.service.ts` — `updateIsoMetadata()`

**Done:** After `document.update()`, create audit log with action `UPDATE`, resourceType `Document`, resourceId, details `{ isoMetadataUpdate: true, fields: Object.keys(data) }`. Log failure is caught and logged without failing the request.

---

## Positive Feedback

- **DTOs:** `UploadDocumentDto` has required `folderId` and `levelId` with `@IsUUID`; `UpdateIsoMetadataDto` uses `@IsOptional`, `@ValidateIf`, `@IsDateString` for nullable/clearable fields. Matches code-standards (class-validator, ApiProperty).
- **Naming:** kebab-case files, PascalCase DTOs/services, camelCase methods. Matches project conventions.
- **Authorization:** `findAll` and `updateIsoMetadata` use `@CheckPolicies` (view/edit Document). Upload uses role-based folder access (admin/dcc/boss vs department restriction).
- **Service logic:** Level and user IDs validated before update; Prisma relation updates use `connect`/`disconnect`; empty payload returns existing document without writing.
- **Access control:** Department resolution via `UsersService.getUserDepartments`; admin/dcc/boss bypass; fail-closed on exception (empty list). After fix, empty list correctly returns no documents.
- **Queries:** `findAll`/`findById` include level and preparer/reviewer/approver with limited select (id, username, fullName). Level filter uses `levelId`. Pagination unchanged.
- **Errors:** `CustomException` with `ErrorCodes` (NOT_FOUND, INVALID_LEVEL, USER.NOT_FOUND). Consistent with existing patterns.
- **Tests:** Controller and service specs updated for new params and includes; `updateIsoMetadata` and access-control behavior covered.

---

## Security

- **Access control:** List is restricted by user departments; empty department list now returns no documents (fix above). GET/PATCH by ID do not yet enforce department (see suggestion 1).
- **Input:** UUIDs and dates validated via DTO/class-validator and service checks (level exists and active, users exist). No raw ID/date injection into queries.
- **Authorization:** JWT + PoliciesGuard; upload and list use role/department logic; PATCH uses edit:Document.

---

## Performance

- **findAll:** One extra `getUserDepartments` for non-admin users; `findMany` + `count` with three extra relation includes (preparer, reviewer, approver). Acceptable for typical list size and pagination.
- **updateIsoMetadata:** Up to two document lookups (existence + after update), one level lookup when levelId present, one user findMany when user IDs present. No N+1.
- **Indexes:** Phase 01 indexes on levelId, preparerId, reviewerId, approverId support these filters and joins.

---

## Conclusion

Phase 02 implementation is solid and aligned with code standards. The critical bug (empty `departmentIdsForFilter` allowing full list access) has been fixed in the service. Remaining suggestions (document-level access for GET/PATCH by ID, DTO type in service, upload validation strategy, optional audit for ISO updates) are improvements, not blockers. Recommend marking Phase 02 review complete and proceeding to Phase 03.
