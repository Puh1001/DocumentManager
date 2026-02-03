# Researcher 02: ISO Document Table UI & Filters (per image)

## Scope
Table columns and filters from provided UI: No., Title, Version, Level, Responsible Department, Preparer, Reviewer, Approver, Approval Date, Receipt Date, Storage Location, Status, uploadPDF; filters: Status, Level, Department.

## Current state

### Document model (Prisma)
- **Has:** id, name, fileName, fileType, fileSize, filePath, folderId, status (ACTIVE/ARCHIVED/DELETED), uploadedBy, uploadedAt, deletionExpiresAt, createdAt, updatedAt.
- **Related:** Folder (path, physicalLocation, departmentId → department), DocumentVersion (version number, createdBy).

### Current documents UI
- **Layout:** Folder tree (left) + document list (right).
- **List columns:** Document Name, Type, Size, Updated, Deletion Status, Actions (view, download, open to edit, version history, delete).
- **Data source:** `GET /storage/folders/:id` → folder.documents; no flat "all ISO documents" list API.

### Gaps vs image
| Column | Current source | Gap |
|--------|----------------|----------------|
| No. | — | Row index |
| Title | Document.name | OK |
| Version | DocumentVersion (count or latest) | Derive from versions |
| Level | — | Not in schema |
| Responsible Department | Folder.departmentId → Department.name | OK via folder |
| Preparer | — | Not in schema |
| Reviewer | — | Not in schema |
| Approver | — | Not in schema |
| Approval Date | — | Not in schema |
| Receipt Date | — | Not in schema |
| Storage Location | Folder.path or physicalLocation | OK |
| Status | Document.status | OK |
| uploadPDF | Link to view/upload | Action column |

## Options

### Option A: Table with existing data only (minimal)
- **Columns:** No., Title (name), Version (from DocumentVersion count or "—"), Level ("—"), Responsible Department (folder.department?.name), Preparer/Reviewer/Approver/Approval/Receipt ("—"), Storage Location (folder.path), Status, uploadPDF (view link).
- **Filters:** Status (enum), Department (from folder), Level (hidden or single "—").
- **Data:** New API or reuse: list documents with folder include (e.g. flat list from folders/tree or new GET /storage/documents?folderId=&status=&departmentId=).
- **Pros:** No migration, fast. **Cons:** Many columns empty.

### Option B: Extend schema for ISO metadata
- **Add to Document:** level (string or enum), preparerId, reviewerId, approverId, approvalDate, receiptDate (optional); or single JSON "isoMetadata".
- **API:** Return these in document DTOs; filters use level, department (folder), status.
- **Pros:** Matches image fully; preparer/reviewer/approver editable. **Cons:** Migration, more backend/frontend.

### Option C: Hybrid
- **Phase 1 (this plan):** Rename + table UI with existing + placeholders (Option A).
- **Phase 2 (later):** Add Level, Preparer, Reviewer, Approver, dates if product confirms.

## Recommendations
1. **Implement Option A first:** Rename to "ISO Document", new table view with columns above; use existing Document + Folder + Department; placeholder "—" for Level, Preparer, Reviewer, Approver, Approval Date, Receipt Date.
2. **Filters:** Status dropdown (ACTIVE/ARCHIVED/DELETED), Department dropdown (from departments API), Level dropdown (optional: hide or "All" only until Level exists).
3. **Data loading:** Either (a) keep folder tree and show table for selected folder (documents in folder + columns as above), or (b) add flat list API GET /storage/documents with query params status, departmentId and render full table. Image suggests single table without tree — need product confirmation or choose (b) for "list all ISO documents" with filters.
4. **uploadPDF:** Column as "View" or "PDF" link to existing document view/stream.

## Related code
- **Frontend:** `apps/web/src/app/[locale]/dashboard/documents/page.tsx`, `components/documents/document-list.tsx`, `document-toolbar.tsx`, `folder-tree.tsx`.
- **API:** `apps/api/src/modules/storage/` (document.service, document.controller), folder tree/list.
- **i18n:** `messages/*/documents.json` (add keys for new column headers and filters).

## Unresolved
- Single flat list (all documents) with filters vs. keep folder tree and table per folder?
- Confirm Level/Preparer/Reviewer/Approver/dates as future phase or omit from MVP.
