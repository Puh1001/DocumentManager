# Phase 02 Code Review: ISO Document Table View & Filters

**Scope:** Phase 02 implementation per [phase-02-iso-document-table-and-filters.md](../phase-02-iso-document-table-and-filters.md)  
**Reviewed against:** `./docs/code-standards.md`  
**Date:** 2026-01-30

---

## Summary

Phase 02 adds ISO-style table columns (No., Title, Version, Level, Responsible Department, Preparer, Reviewer, Approver, Approval Date, Receipt Date, Storage Location, Status, uploadPDF, Actions), Status and Department filters, and reuses folder API with optional `?status=` and `_count.versions` on documents. Layout (A): folder tree + table per folder; no new list API.

**Verdict:** Approved. One fix applied: remove unused imports in `document-list.tsx` (formatFileSize, formatDate, getFileIcon). Suggestions below are non-blocking.

---

## Critical Issues (fixed)

1. **document-list.tsx — Unused imports**
   - Removed `formatFileSize`, `formatDate`, `getFileIcon` from `@/lib/utils` (no longer used after ISO table columns). Kept single `fixFileNameEncoding` import from `@/lib/utils/encoding-fix`.

---

## Suggestions

1. **handleSyncEvent — Preserve department filter after sync (done)**
   - Now calls `loadFolderTree(departmentFilter || undefined)` on sync_completed and folder_* events; departmentFilter and statusFilter added to useCallback deps. “all departments.”
2. **Status dropdown — i18n (done)**
   - Added `documents.filters.statusActive`, `statusArchived`, `statusDeleted` in en/vi/zh; toolbar uses them for Status options.

3. **Toolbar filter labels (done)**
   - Added labels "Status:" and "Department:" (via tFilters) next to each select; wrapped in flex with gap.

4. **document-list — File size**
   - Optional: If product wants file size or type back, add as extra columns or tooltip. Not implemented (product decision).

---

## Positive Feedback

- **KISS/DRY:** Reused existing folder API; extended with optional `status` and `_count.versions`; no new document list endpoint. Layout (A) kept; filters wired via existing tree + folder contents.
- **Type safety:** Backend `documentsWhere` and `docStatus` use Prisma types (`Prisma.DocumentWhereInput`, `EnumDocumentStatusFilter["equals"]`). Frontend props (`folder`, `locale`, `Document._count`) are typed.
- **Permissions:** DocumentList still uses `ability?.can("view"|"download"|"edit", …)` for uploadPDF link and action buttons; no new bypass.
- **i18n:** Column and filter keys added in en/vi/zh `documents.json`; `documents.filters` and `list.columns` used consistently.
- **Backward compatibility:** `findById(id)` (no second arg) still works: `documentStatus` optional; missing/empty => all statuses; existing callers unaffected.
- **Placeholders:** Level, Preparer, Reviewer, Approver, Approval/Receipt dates use constant "—"; Version and Responsible Department/Storage Location/Status use real data where available.

---

## Security

- **Folder API:** Still behind `JwtAuthGuard`; no new public route. `GET /storage/folders/:id?status=` returns same folder + documents; document visibility remains as before (folder-based).
- **Departments:** `GET /departments` is existing API; used only to populate Department filter. No new auth surface.
- **Recommendation:** No change. If document-level ACL is added later, apply it in folder service when loading documents.

---

## Performance

- **Backend:** One extra `_count: { select: { versions: true } }` per document in the same query; no N+1. Optional `status` filter can reduce document set.
- **Frontend:** Departments fetched once on mount. Tree and folder contents refetched when status/department/folder change; no unnecessary refetch detected.
- **Table:** Many columns (14) with horizontal scroll; `whitespace-nowrap` and `truncate` on long paths are appropriate.

---

## Code Standards Alignment

- **Naming:** kebab-case files, PascalCase interfaces (Folder, Document, DocumentListProps), camelCase handlers — OK.
- **Structure:** Toolbar and list receive props; filter state lifted to page; no business logic in UI-only components — OK.
- **Error handling:** Folder load errors logged and state cleared; departments fetch catch sets `[]` — OK.
- **Single responsibility:** Toolbar = filters + upload/sync/refresh; List = table + actions; Page = data loading and filter state — OK.
