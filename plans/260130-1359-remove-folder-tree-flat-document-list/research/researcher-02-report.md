# Researcher 02 Report: Frontend UI Redesign

**Date:** 2026-01-30  
**Researcher:** Researcher 02  
**Topic:** Frontend UI changes to remove folder tree and show flat document list

## Current UI Structure

### Layout
```
┌─────────────────────────────────────────┐
│  ISO Document (Page Title)              │
├──────────┬──────────────────────────────┤
│ Folder   │  Filters + Toolbar          │
│ Tree     │  ┌────────────────────────┐ │
│ (Sidebar)│  │ Document Table          │ │
│          │  │ (columns...)            │ │
│          │  └────────────────────────┘ │
└──────────┴──────────────────────────────┘
```

### Components
- `FolderTree` - Left sidebar folder navigation
- `DocumentToolbar` - Filters (Status, Department) + actions
- `DocumentList` - Table with document columns
- `page.tsx` - Main page component

## Required Changes

### 1. Remove Folder Tree
**File:** `apps/web/src/app/[locale]/dashboard/documents/page.tsx`

**Changes:**
- Remove `FolderTree` import and component
- Remove folder-related state: `folders`, `selectedFolderId`, `selectedFolder`
- Remove `loadFolderTree` function
- Remove folder selection logic
- Change grid layout from `lg:grid-cols-4` to full width

### 2. Update Document Loading
**Current:** Load documents per selected folder
**New:** Load all documents with filters

**Changes:**
- Replace `loadFolderContents(folderId, status)` with `loadAllDocuments(filters)`
- New function: `loadAllDocuments({ status, departmentId, level })`
- Call new API: `GET /storage/documents?status=...&departmentId=...`

### 3. Update Filters
**Current:** Status, Department filters (Department filters folder tree)
**New:** Status, Level, Department filters (all filter document list)

**Changes:**
- Add Level filter dropdown (placeholder for future)
- Department filter now filters documents directly (not folder tree)
- Update `DocumentToolbar` to include Level filter
- Remove folder-related props from toolbar

### 4. Update Document List
**Current:** Receives `folder` prop for department/path info
**New:** Each document includes folder info in response

**Changes:**
- Update `DocumentList` to extract folder info from document object
- Remove `folder` prop dependency
- Update column rendering to use `document.folder.department.name`
- Update Storage Location to use `document.folder.path`

### 5. Update Upload Flow
**Current:** Upload requires selected folder
**New:** Upload needs folder selection (modal/dialog?)

**Options:**
- **Option A:** Keep upload button, show folder picker dialog
- **Option B:** Remove upload from this page (move to separate page)
- **Option C:** Require folder selection before showing upload button

**Recommendation:** Option A - Show folder picker dialog on upload click (KISS)

## Component Changes Summary

### `page.tsx`
- Remove folder tree state/logic
- Add `loadAllDocuments` function
- Update filters to trigger document reload
- Remove folder selection handlers
- Update layout (remove sidebar grid)

### `document-toolbar.tsx`
- Add Level filter dropdown
- Remove folder-related props (folder, onFolderSelect)
- Keep Status, Department filters
- Update upload handler (show folder picker)

### `document-list.tsx`
- Remove `folder` prop
- Extract folder info from `document.folder`
- Update column rendering
- No other changes needed (table structure stays same)

## Layout Changes

### Before
```tsx
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
  <Card className="lg:col-span-1">
    <FolderTree />
  </Card>
  <div className="lg:col-span-3">
    <DocumentToolbar />
    <DocumentList />
  </div>
</div>
```

### After
```tsx
<div className="space-y-4">
  <DocumentToolbar />
  <Card>
    <DocumentList />
  </Card>
</div>
```

## State Management

### Removed State
- `folders: Folder[]`
- `selectedFolderId: string | null`
- `selectedFolder: Folder | null`

### Updated State
- `documents: Document[]` - Now loaded from new endpoint
- `statusFilter: string` - Filters documents
- `departmentFilter: string` - Filters documents (not folder tree)
- `levelFilter: string` - New filter (placeholder)

## API Integration

### New API Call
```typescript
const loadAllDocuments = async (filters: {
  status?: string;
  departmentId?: string;
  level?: string;
}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.departmentId) params.append("departmentId", filters.departmentId);
  if (filters.level) params.append("level", filters.level);
  
  const documents = await api.get<Document[]>(
    `/storage/documents?${params.toString()}`
  );
  setDocuments(documents);
};
```

## Upload Handling

### Folder Picker Dialog
Create new component or reuse existing:
- Show folder tree in dialog
- User selects folder
- Upload document to selected folder
- Refresh document list after upload

**Component:** `UploadDocumentDialog` (new or extend existing)

## Recommendations

1. Remove folder tree completely
2. Create new API endpoint for flat document list
3. Update filters to work on document list
4. Add Level filter (placeholder)
5. Handle upload with folder picker dialog
6. Update layout to full width
7. Keep table structure unchanged
