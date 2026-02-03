# Debug Report: KPI Upload level_id Null Constraint Violation

**Date:** 2026-02-03  
**Issue:** KPI uploads fail with "Null constraint violation on the fields: (`level_id`)"  
**Requirement:** KPI uploads should default to document level 1

## Problem Summary

When uploading KPI attachments, the system throws a database error:

```
Invalid `prisma.document.create()` invocation: Null constraint violation on the fields: (`level_id`)
```

## Root Cause Analysis

### Phase 1: Root Cause Investigation

**Error Location:** `apps/api/src/modules/kpi/services/kpi-attachment.service.ts:161-167`

**Issue:** The `documentService.upload()` method is called without the `levelId` parameter:

```typescript
const document = await this.documentService.upload(
  targetFolderId,
  file,
  user.userId,
  record.title,
  fileName
  // ❌ levelId is missing here
);
```

**Why it fails:**

1. `documentService.upload()` has `levelId` as optional parameter (line 224 in document.service.ts)
2. However, the database schema requires `level_id` to be NOT NULL (schema.prisma line 215)
3. When `levelId` is `undefined`, Prisma tries to insert `null` into the database
4. This violates the NOT NULL constraint, causing the error

**Validation check exists but doesn't prevent this:**

- `document.service.ts:244-249` checks if `levelId` is missing and throws a BadRequest error
- However, this validation might be bypassed if `levelId` is passed as `undefined` (not missing entirely)

### Phase 2: Pattern Analysis

**Working example:** `document-sync.handler.ts:27-37` shows how to get default level ID:

```typescript
private async getDefaultLevelId(): Promise<string | null> {
  const level = await (this.prisma as PrismaClientLike).documentLevel.findFirst({
    where: { code: "LEVEL1", isActive: true },
    select: { id: true },
  });
  return level?.id ?? null;
}
```

**Current KPI upload flow:**

1. User uploads PDF via KPI attachment endpoint
2. `KpiAttachmentService.uploadAttachment()` resolves folder structure
3. Calls `documentService.upload()` **without levelId**
4. Document creation fails with null constraint violation

### Phase 3: Hypothesis

**Fix:** Inject `DocumentLevelService` into `KpiAttachmentService` and:

1. Get default level ID (LEVEL1) before calling `documentService.upload()`
2. Pass the level ID to `documentService.upload()` as the 6th parameter
3. This ensures KPI uploads default to document level 1 as required

## Evidence

1. **Error message:** "Null constraint violation on the fields: (`level_id`)"
2. **Code location:** `kpi-attachment.service.ts:161-167` - missing `levelId` parameter
3. **Database constraint:** `schema.prisma:215` - `levelId String @map("level_id")` (required, NOT NULL)
4. **User requirement:** "KPI khi uploads sẽ upload vào thư mục KPI của department tương ứng và mặc định là tài liệu cấp 1"

## Fix Plan

1. Inject `DocumentLevelService` into `KpiAttachmentService` constructor
2. In `uploadAttachment()`, get default level ID (LEVEL1) before document upload
3. Pass `levelId` to `documentService.upload()` call
4. Add error handling if LEVEL1 doesn't exist (shouldn't happen, but defensive)
5. Test the fix

## Implementation

### Changes Made

1. **Added DocumentLevelService import** (`kpi-attachment.service.ts:20`)
   - Import `DocumentLevelService` from storage module

2. **Injected DocumentLevelService** (`kpi-attachment.service.ts:60`)
   - Added to constructor dependencies

3. **Get default level ID before upload** (`kpi-attachment.service.ts:159-167`)
   - Query for LEVEL1 document level before calling `documentService.upload()`
   - Validate that LEVEL1 exists and is active
   - Throw error if LEVEL1 not found (defensive check)

4. **Pass levelId to documentService.upload()** (`kpi-attachment.service.ts:175`)
   - Added `defaultLevel.id` as 6th parameter to `documentService.upload()`

5. **Updated test file** (`kpi-attachment.service.spec.ts`)
   - Added `DocumentLevelService` mock
   - Updated test expectation to include `levelId` parameter

### Verification

- ✅ Build successful (no compilation errors)
- ✅ All tests pass (18/18)
- ✅ Fix ensures KPI uploads default to document level 1 as required

## Summary

**Root Cause:** `KpiAttachmentService.uploadAttachment()` called `documentService.upload()` without `levelId`, causing null constraint violation.

**Fix:** Get default LEVEL1 document level ID and pass it to `documentService.upload()`.

**Result:** KPI uploads now default to document level 1, and uploads succeed without errors.
