# Phase 00: Upload Requirements Implementation

## Context Links

- Parent: [plan.md](plan.md)
- Depends on: [phase-01-database-schema.md](phase-01-database-schema.md)
- Research: [researcher-03-report.md](research/researcher-03-report.md)
- Component: `apps/web/src/components/documents/folder-picker-dialog.tsx`
- Page: `apps/web/src/app/[locale]/dashboard/documents/page.tsx`

## Overview

- **Date:** 2026-01-30
- **Priority:** High (Must complete before Phase 02)
- **Description:** Update upload flow to require level selection. Auto-set department from uploader. Auto-populate preparer and receipt date.
- **Implementation status:** Completed
- **Review status:** Completed — see [reports/phase-00-code-review.md](reports/phase-00-code-review.md)

## Key Insights

- Level must be REQUIRED when uploading (user must select)
- **Level stored in database** (DocumentLevel lookup table, not hardcoded)
- Levels fetched from API endpoint (GET /storage/document-levels)
- Responsible Department automatically set from uploader's department
- Preparer automatically set to uploader
- Receipt Date automatically set to upload date
- Folder picker should filter by user's department (unless admin/dcc/boss)

## Requirements

### Functional

- Add level selector to upload flow (required field)
- **Fetch available levels from API** (GET /storage/document-levels)
- Get uploader's department automatically
- Auto-populate preparer field (uploader's userId)
- Auto-populate receipt date (current date)
- Filter folder picker by user's department (unless admin/dcc/boss)
- Validate level is selected before upload
- Validate level exists in database (backend)

### Non-Functional

- Clear error messages if level not selected
- Show user's department in upload UI
- Disable upload button if level not selected
- Follow existing upload patterns

## Architecture

### Upload Flow

```
User clicks Upload
  → Select file
  → Level selector (REQUIRED)
  → Folder picker (filtered by user's department)
  → Upload button (disabled if level not selected)
  → API call with level + file + folderId
  → Backend auto-sets:
     - preparerId = userId
     - receiptDate = now()
     - department = user's department
```

### Component Updates

```typescript
// Upload component
interface UploadState {
  file: File | null;
  level: string; // REQUIRED
  folderId: string | null;
  userDepartment: Department | null;
}

// Level options fetched from API
interface DocumentLevel {
  id: string;
  code: string; // e.g., "LEVEL1", "LEVEL2"
  name: string; // Display name
  nameEn?: string;
  nameVi?: string;
  nameZh?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

// Fetch from API: GET /storage/document-levels
const levels = await api.get<DocumentLevel[]>("/storage/document-levels");
```

## Related Code Files

### Files to Modify

- `apps/web/src/app/[locale]/dashboard/documents/page.tsx` - Add level selector
- `apps/web/src/components/documents/folder-picker-dialog.tsx` - Filter by user department
- `apps/web/src/components/documents/document-toolbar.tsx` - Update upload flow

### Files to Create

- `apps/web/src/components/documents/level-selector.tsx` - Level selection component (fetches from API)

## Implementation Steps

1. **Get User Department**
   - Fetch current user info (includes departments)
   - Get user's first department (or all if multiple)
   - Store in component state

2. **Add Level Selector**
   - Create level dropdown/select component
   - **Fetch available levels from API** (GET /storage/document-levels)
   - Filter by isActive = true
   - Sort by sortOrder
   - Display name based on locale (nameEn, nameVi, nameZh)
   - Make it required (validation)
   - Show error if not selected
   - Handle loading and error states

3. **Update Folder Picker**
   - Filter folders by user's department
   - Skip filter for admin/dcc/boss roles
   - Show user's department name in UI

4. **Update Upload Handler**
   - Require level before upload
   - Include level in upload API call
   - Show loading state
   - Handle errors

5. **Update API Call**
   - Add levelId (or levelCode) to upload request body
   - Backend will validate level exists in database
   - Backend will auto-set department, preparer, receipt date

## Todo List

- [x] Get user's department from auth context
- [x] Create API endpoint to fetch levels (GET /storage/document-levels)
- [x] Create level selector component (fetches from API)
- [x] Add level selector to upload flow
- [x] Handle loading/error states for level fetch
- [x] Display level names based on locale
- [x] Make level required (validation)
- [x] Update folder picker to filter by department
- [x] Update upload handler to include levelId/levelCode
- [x] Update API client to send level
- [ ] Test upload with level selection (manual/E2E)
- [ ] Test department filtering (manual/E2E)
- [ ] Test admin/dcc/boss see all folders (manual/E2E)
- [x] Add translation keys for level

## Success Criteria

- Level selector appears in upload flow
- Level is required (upload disabled if not selected)
- User's department is displayed/used automatically
- Folder picker filtered by user's department
- Admin/dcc/boss see all folders
- Upload includes level in API call
- Preparer and receipt date auto-populated by backend
- Clear error messages

## Risk Assessment

### Risks

- **Level options:** Need to create DocumentLevel table and seed initial data
- **API dependency:** Frontend depends on levels API endpoint
- **Multiple departments:** User with multiple departments - use first or allow selection?
- **Breaking change:** Existing uploads will fail without level

### Mitigations

- Create DocumentLevel table in Phase 01
- Seed initial levels (LEVEL1, LEVEL2, LEVEL3, etc.)
- Create API endpoint to fetch levels
- Use first department if user has multiple (or allow selection)
- Update frontend before backend deployment
- Add clear error messages
- Handle API errors gracefully (fallback or retry)

## Security Considerations

- Validate level on frontend and backend
- Ensure folder belongs to user's department (backend validation)
- Prevent unauthorized folder access

## Completion Note (2026-01-30)

- Backend: DocumentLevel schema, migration, seed; GET `/storage/document-levels`; upload accepts `levelId` (optional).
- Frontend: Level selector component, folder picker with department filter, upload flow with level + folder; i18n keys added.
- Document.service.spec.ts updated (DocumentLevelService mock, `level: true` in findAll expectations); all 26 tests pass.
- Auto-population (preparer, receipt date) and department-based access control are planned for Phase 02.

## Next Steps

- Proceed to Phase 02: Backend API Updates
- Backend will handle auto-population and validation
