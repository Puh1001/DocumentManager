# Researcher 02: Frontend UI & User Experience

## Scope
Analyze current frontend implementation and identify changes needed for ISO document table with new metadata fields.

## Current State

### Documents Page
**Location:** `apps/web/src/app/[locale]/dashboard/documents/page.tsx`

**Current Features:**
- Flat document list (no folder tree sidebar)
- Pagination (page, limit)
- Filters: Status, Department, Level (placeholder)
- Upload with folder picker dialog
- Real-time sync via WebSocket
- Document list component

### Document List Component
**Location:** `apps/web/src/components/documents/document-list.tsx`

**Current Columns:**
- No. (row index)
- Title (name + fileName)
- Version (from _count.versions)
- Level ("—" placeholder)
- Responsible Department (folder.department?.name)
- Preparer ("—" placeholder)
- Reviewer ("—" placeholder)
- Approver ("—" placeholder)
- Approval Date ("—" placeholder)
- Receipt Date ("—" placeholder)
- Storage Location (folder.path)
- Status (document.status badge)
- uploadPDF (View link button)
- Actions (view, download, edit, rename, version history, delete)

**Current Data Source:**
- `GET /storage/documents?status=&departmentId=&level=&page=&limit=`
- Returns documents with folder.department included

### Document Toolbar
**Location:** `apps/web/src/components/documents/document-toolbar.tsx`

**Current Filters:**
- Status dropdown (ACTIVE/ARCHIVED/DELETED)
- Department dropdown (from departments API)
- Level dropdown (placeholder, not functional)

## Gaps Analysis

### Display Gaps
1. **Level Column**: Shows "—", needs actual data from schema
2. **Preparer/Reviewer/Approver**: Show "—", need user names from relations
3. **Approval/Receipt Dates**: Show "—", need formatted dates
4. **User Selection**: No UI to select preparer/reviewer/approver

### Editing Gaps
1. **Inline Editing**: No way to edit metadata fields in table
2. **Bulk Editing**: No way to update multiple documents
3. **Form Dialog**: No dialog/form to edit ISO metadata
4. **User Picker**: No component to select users for preparer/reviewer/approver

### Filtering Gaps
1. **Level Filter**: Exists but not functional (no data)
2. **User Filters**: No filters for preparer/reviewer/approver
3. **Date Filters**: No date range filters for approval/receipt dates

## UI Requirements (from Image)

### Table Columns
All columns from image are present, but need data:
- No. ✓ (row index)
- Title ✓ (name)
- Version ✓ (from versions count)
- Level ✗ (needs schema + data)
- Responsible Department ✓ (from folder)
- Preparer ✗ (needs schema + user relation + display)
- Reviewer ✗ (needs schema + user relation + display)
- Approver ✗ (needs schema + user relation + display)
- Approval Date ✗ (needs schema + formatted date)
- Receipt Date ✗ (needs schema + formatted date)
- Storage Location ✓ (folder.path)
- Status ✓ (status badge)
- uploadPDF ✓ (view link)
- Actions ✓ (action buttons)

### Filters (from Image)
- Status dropdown ✓ (exists)
- Level dropdown ✗ (needs data)
- Department dropdown ✓ (exists)

## Recommendations

### Phase 1: Display Enhancement
1. **Update DocumentList Component:**
   - Replace placeholders with actual data when available
   - Format dates (approvalDate, receiptDate)
   - Display user names (preparer, reviewer, approver)
   - Show level value

2. **Data Loading:**
   - Update API response to include user relations
   - Include preparer/reviewer/approver in document query
   - Format dates on backend or frontend

### Phase 2: Editing Capability
1. **Create Edit Dialog:**
   - Form with fields: Level, Preparer, Reviewer, Approver, Approval Date, Receipt Date
   - User picker component for selecting users
   - Date picker for dates
   - Save/Cancel buttons

2. **Update API:**
   - `PATCH /storage/documents/:id/iso-metadata` endpoint
   - DTO for ISO metadata update
   - Validation for dates, user IDs

3. **Table Actions:**
   - Add "Edit Metadata" button in Actions column
   - Open edit dialog on click
   - Refresh table after save

### Phase 3: Filtering Enhancement
1. **Level Filter:**
   - Populate dropdown with available levels
   - Filter documents by selected level

2. **User Filters (Optional):**
   - Add preparer/reviewer/approver filters
   - Multi-select dropdowns

3. **Date Filters (Optional):**
   - Date range picker for approval/receipt dates

## UI Components Needed

### New Components
1. **IsoMetadataEditDialog**
   - Form dialog for editing ISO metadata
   - User picker for preparer/reviewer/approver
   - Date picker for approval/receipt dates
   - Level dropdown/input

2. **UserPicker** (if not exists)
   - Searchable user dropdown
   - Display user name + department
   - Multi-select support (optional)

### Updated Components
1. **DocumentList**
   - Display actual data instead of placeholders
   - Add "Edit Metadata" action button
   - Format dates properly

2. **DocumentToolbar**
   - Populate Level filter dropdown
   - Add user filters (optional)

## Translation Keys Needed
**Location:** `apps/web/messages/{locale}/documents.json`

Add keys for:
- `isoMetadata.edit`
- `isoMetadata.level`
- `isoMetadata.preparer`
- `isoMetadata.reviewer`
- `isoMetadata.approver`
- `isoMetadata.approvalDate`
- `isoMetadata.receiptDate`
- `isoMetadata.save`
- `isoMetadata.cancel`

## Related Files
- `apps/web/src/app/[locale]/dashboard/documents/page.tsx` - Main page
- `apps/web/src/components/documents/document-list.tsx` - Table component
- `apps/web/src/components/documents/document-toolbar.tsx` - Filter toolbar
- `apps/web/messages/{locale}/documents.json` - Translations
- `apps/web/src/lib/api.ts` - API client
