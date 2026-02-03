# Phase 01: Backend Filter - ISO_documents Only

**Status:** Pending  
**Dependencies:** None

## Goal

Add filtering logic to `DocumentService.findAll()` to only include documents whose folder path is under the `ISO_documents` section.

## Implementation

### Step 1: Import StoragePathBuilder

**File:** `apps/api/src/modules/storage/services/document.service.ts`

Add import at top:
```typescript
import { StoragePathBuilder } from "../utils/storage-path.util";
```

### Step 2: Add ISO_documents Filter Logic

**File:** `apps/api/src/modules/storage/services/document.service.ts`

**Location:** Inside `findAll()` method, after existing folder exclusions (around line 122)

**Current code:**
```typescript
const folderWhere: Prisma.FolderWhereInput = {
  AND: [
    { path: { not: { contains: "/versions/" } } },
    { path: { not: { contains: "\\versions\\" } } },
    // Exclude Delete_files folders...
  ],
};
```

**New code:**
```typescript
const folderWhere: Prisma.FolderWhereInput = {
  AND: [
    { path: { not: { contains: "/versions/" } } },
    { path: { not: { contains: "\\versions\\" } } },
    // Exclude Delete_files folders (case-insensitive matching for various formats)
    { path: { not: { contains: "/Delete_files" } } },
    { path: { not: { contains: "\\Delete_files" } } },
    { path: { not: { contains: "/delete files" } } },
    { path: { not: { contains: "\\delete files" } } },
    { path: { not: { contains: "/Deleted files" } } },
    { path: { not: { contains: "\\Deleted files" } } },
    // NEW: Only include folders under ISO_documents section
    {
      OR: [
        { path: { contains: "/ISO_documents" } },
        { path: { contains: "\\ISO_documents" } },
        { path: { endsWith: "/ISO_documents" } },
        { path: { equals: "ISO_documents" } },
      ],
    },
  ],
};
```

**Rationale:**
- Uses Prisma `OR` to match paths containing `/ISO_documents` or `\ISO_documents` (Windows)
- Also matches paths ending with `/ISO_documents` or exactly `ISO_documents`
- Works with both new (`{dept}/ISO_documents`) and legacy (`{dept}/ISO_documents/current`) paths
- Case-sensitive matching (consistent with existing code style)

### Step 3: Verify Compilation

Run TypeScript compilation:
```bash
cd apps/api
npm run build
```

## Testing Checklist

- [ ] Code compiles without errors
- [ ] Existing tests still pass (no regressions)
- [ ] Manual test: Documents from `ISO_documents` appear in list
- [ ] Manual test: Documents from `KPI` do NOT appear in list
- [ ] Manual test: Documents from `Maintenance` do NOT appear in list
- [ ] Manual test: Documents from `Delete_files` do NOT appear in list (already excluded)
- [ ] Manual test: Legacy paths like `{dept}/ISO_documents/current` still work

## Expected Behavior

**Before:**
- `/dashboard/documents` shows documents from all sections (KPI, ISO_documents, Maintenance)

**After:**
- `/dashboard/documents` shows ONLY documents from `ISO_documents` section
- KPI attachments, Maintenance docs, Delete_files content are excluded

## Notes

- This is a **breaking change** for the API endpoint `GET /storage/documents` - all consumers will now only see ISO_documents
- KPI and Maintenance features use their own endpoints/modules, so they are unaffected
- The filter uses Prisma query filters, so it's efficient (database-level filtering)

## Rollback Plan

If issues arise, revert the `OR` clause addition in `folderWhere.AND` array.
