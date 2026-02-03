# Phase 02: Frontend Redesign - Remove Folder Tree

## Context
- Parent: [plan.md](plan.md)
- Depends on: [phase-01-backend-api.md](phase-01-backend-api.md)
- Research: [researcher-02-report.md](research/researcher-02-report.md)

## Overview
- **Date:** 2026-01-30
- **Priority:** High
- **Description:** Remove folder tree sidebar, update UI to show flat document list with filters
- **Implementation status:** Completed
- **Review status:** Completed - See [reports/phase-02-code-review.md](reports/phase-02-code-review.md)

## Key Insights
- Current UI uses folder tree for navigation
- Need to load all documents instead of folder-specific
- Filters (Status, Level, Department) apply to document list
- Upload requires folder selection (show picker dialog)
- Table structure stays the same

## Requirements
- **Functional:** Remove folder tree, show all documents, filters work
- **Non-functional:** Maintain existing table functionality, upload flow

## Architecture
- Remove `FolderTree` component from page
- Update `page.tsx` to load all documents via new API
- Update `DocumentToolbar` to add Level filter
- Update `DocumentList` to extract folder info from document object
- Create/update upload dialog with folder picker

## Related code files
| File | Action |
|------|--------|
| `apps/web/src/app/[locale]/dashboard/documents/page.tsx` | Remove folder tree, update document loading |
| `apps/web/src/components/documents/document-toolbar.tsx` | Add Level filter, remove folder props |
| `apps/web/src/components/documents/document-list.tsx` | Update to use document.folder instead of folder prop |
| `apps/web/messages/{en,vi,zh}/documents.json` | Add Level filter i18n keys |

## Implementation Steps
1. Update `page.tsx`
   - Remove `FolderTree` import and component
   - Remove folder-related state (folders, selectedFolderId, selectedFolder)
   - Remove `loadFolderTree` function
   - Add `loadAllDocuments` function (calls new API)
   - Update layout (remove sidebar grid, full width)
   - Update filters to trigger `loadAllDocuments`
   - Handle upload with folder picker dialog
2. Update `DocumentToolbar`
   - Add Level filter dropdown (placeholder)
   - Remove folder-related props
   - Keep Status, Department filters
   - Update upload handler (show folder picker)
3. Update `DocumentList`
   - Remove `folder` prop
   - Extract folder info from `document.folder`
   - Update Responsible Department column: `document.folder.department.name`
   - Update Storage Location column: `document.folder.path`
4. Add i18n keys for Level filter
   - `documents.filters.level`
   - `documents.filters.levelAll` (optional)

## Todo list
- [x] Remove folder tree from page.tsx
- [x] Add loadAllDocuments function
- [x] Update layout (remove sidebar)
- [x] Add Level filter to DocumentToolbar
- [x] Update DocumentList to use document.folder
- [x] Add upload folder picker dialog
- [x] Add Level filter i18n keys
- [x] Update filter handlers

## Success Criteria
- Folder tree removed from UI
- All documents displayed in table
- Filters (Status, Level, Department) work
- Upload shows folder picker
- Table columns display correctly
- No broken functionality

## Risk Assessment
- **Medium:** Significant UI change, need thorough testing
- **Upload flow:** May need folder picker component

## Security Considerations
- Permission checks handled by backend API
- Frontend respects filter results

## Next steps
- Proceed to Phase 03 (Testing & documentation)
