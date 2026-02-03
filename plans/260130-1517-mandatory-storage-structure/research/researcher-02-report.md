# Researcher 02 Report: Department Creation Flow Analysis

**Date:** 2026-01-30  
**Researcher:** Researcher-02  
**Topic:** Department creation flow and folder auto-creation hook

## Current Department Creation Flow

### DepartmentService.create()

**File:** `apps/api/src/modules/department/services/department.service.ts`

**Current Behavior:**
1. Check if code exists
2. Create department record in database
3. **NO folder creation** - folders created lazily when needed

**Issue:** Folders created on-demand via `ensureDepartmentFolderStructure()`, not automatically when department is created.

### Folder Creation Trigger Points

**Current Triggers:**
1. `FolderService.ensureDepartmentFolderStructure()` - Called by:
   - KPI attachment upload
   - Document upload (via folder selection)
   - Manual folder sync

**Problem:** If department created but no files uploaded, folder structure doesn't exist.

## Required Changes

### Auto-Creation Hook

**Option 1: Hook in DepartmentService.create()**
- After creating department, call `FolderService.ensureDepartmentFolderStructure()`
- Pros: Immediate creation, guaranteed structure
- Cons: Requires injecting FolderService into DepartmentService

**Option 2: Database Trigger/Prisma Hook**
- Use Prisma middleware to hook into department creation
- Pros: Automatic, no service dependency
- Cons: More complex, harder to debug

**Option 3: Event-Based (NestJS Events)**
- Emit event when department created
- FolderService listens and creates structure
- Pros: Decoupled, extensible
- Cons: More setup, async complexity

**Recommendation:** Option 1 (direct call) - simplest and most reliable.

## Implementation Plan

### Step 1: Inject FolderService into DepartmentService

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly folderService: FolderService, // NEW
) {}
```

### Step 2: Call ensureDepartmentFolderStructure() after create

```typescript
async create(dto: CreateDepartmentDto) {
  // ... existing validation ...
  
  const department = await this.prisma.department.create({
    // ... existing data ...
  });
  
  // Auto-create folder structure
  try {
    await this.folderService.ensureDepartmentFolderStructure(department.id);
  } catch (error) {
    // Log error but don't fail department creation
    // Folder structure can be created later via sync
    console.error('Failed to auto-create folder structure:', error);
  }
  
  return department;
}
```

### Step 3: Update ensureDepartmentFolderStructure()

- Change "Documents" → "ISO_documents"
- Remove "current" subfolder creation
- Ensure files stored directly in section folders

## Files to Modify

1. `apps/api/src/modules/department/services/department.service.ts`
   - Inject FolderService
   - Call `ensureDepartmentFolderStructure()` after create

2. `apps/api/src/modules/department/department.module.ts`
   - Import StorageModule (to access FolderService)

3. `apps/api/src/modules/storage/services/folder.service.ts`
   - Update `ensureDepartmentFolderStructure()` for new structure

## Error Handling

**Scenario:** Folder creation fails (SMB unavailable, permissions, etc.)

**Strategy:**
- Log error but don't fail department creation
- Department can exist without folder structure
- Folder structure created later via sync or manual trigger
- User can retry folder creation via admin UI

## Unresolved Questions

None - implementation is straightforward.
