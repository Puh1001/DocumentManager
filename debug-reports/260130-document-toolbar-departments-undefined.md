# Debug Report: DocumentToolbar departments undefined error

**Date:** 2026-01-30  
**Issue:** `TypeError: Cannot read properties of undefined (reading 'map')`  
**Location:** `src/components/documents/document-toolbar.tsx:144`

## Root Cause

The `DocumentToolbar` component expects a `departments` prop (array), but it's not being passed from the parent `DocumentsPage` component. When the component tries to call `departments.map()`, `departments` is `undefined`, causing the runtime error.

## Analysis

### Component Interface
```typescript
// document-toolbar.tsx (lines 35-45)
interface DocumentToolbarProps {
  folder: Folder | null;
  statusFilter: string;
  departmentFilter: string;
  onStatusChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  departments: Department[];  // Required prop
  onUpload: (file: File) => void;
  onRefresh: () => void;
  onSync?: () => Promise<void>;
}
```

### Current Usage
```typescript
// page.tsx (lines 329-344)
<DocumentToolbar
  folder={selectedFolder}
  onUpload={handleUpload}
  onRefresh={() => ...}
  onSync={handleSync}
/>
// Missing: statusFilter, departmentFilter, onStatusChange, onDepartmentChange, departments
```

### State Available in Parent
```typescript
// page.tsx (lines 62-66)
const [statusFilter, setStatusFilter] = useState<string>("");
const [departmentFilter, setDepartmentFilter] = useState<string>("");
const [departments, setDepartments] = useState<
  { id: string; name: string; code: string }[]
>([]);
```

## Solution

Add the missing props to the `DocumentToolbar` component call:

```typescript
<DocumentToolbar
  folder={selectedFolder}
  statusFilter={statusFilter}
  departmentFilter={departmentFilter}
  onStatusChange={setStatusFilter}
  onDepartmentChange={setDepartmentFilter}
  departments={departments}
  onUpload={handleUpload}
  onRefresh={() => ...}
  onSync={handleSync}
/>
```

## Additional Fix

Add defensive check in `DocumentToolbar` to handle undefined/null departments gracefully:

```typescript
{departments?.map((d) => (
  <option key={d.id} value={d.id}>
    {d.name}
  </option>
))}
```

## Impact

- **Severity:** High (runtime error prevents page from rendering)
- **Affected:** All users accessing the ISO Document page
- **Fix Complexity:** Low (add missing props)

## Verification

After fix:
1. Page should load without errors
2. Status filter dropdown should work
3. Department filter dropdown should show departments
4. Filters should update document list correctly
