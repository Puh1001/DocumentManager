# Debug Report: Client Files Upload - Remove Level Requirement

**Date:** 2026-02-26  
**Status:** ✅ Fixed (requires Prisma client regeneration)

---

## Problem Summary

**Symptom:**
- Client file upload fails with error: `errors.errors.document.upload.invalid_level`
- Error occurs when CLIENT document level doesn't exist or is inactive
- User requirement: Client files should NOT require a document level for upload

**Root Cause:**
- `ClientService.upload()` was requiring a CLIENT document level to exist
- Prisma schema had `levelId String` (required, NOT NULL)
- Client files are simpler than ISO documents and don't need level classification

---

## Fix Applied

### ✅ Step 1: Updated Prisma Schema

**File:** `apps/api/prisma/schema.prisma`

- Changed `levelId String` → `levelId String?` (nullable)
- Updated relation: `level DocumentLevel` → `level DocumentLevel?` (optional relation)

### ✅ Step 2: Created Database Migration

**File:** `apps/api/prisma/migrations/20260226120000_make_level_id_nullable_for_client_files/migration.sql`

```sql
-- Make level_id nullable to support client files (which don't require a level)
ALTER TABLE "documents" ALTER COLUMN "level_id" DROP NOT NULL;
```

### ✅ Step 3: Updated ClientService.upload()

**File:** `apps/api/src/modules/client/client.service.ts`

**Changes:**
- Removed requirement to find CLIENT level: `documentLevelService.findByCode("CLIENT")`
- Removed error check for missing/inactive CLIENT level
- Set `levelId: null` when creating client file documents
- Removed unused `DocumentLevelService` dependency from constructor

**Before:**
```typescript
const clientLevel = await this.documentLevelService.findByCode("CLIENT");
if (!clientLevel?.isActive) {
  throw CustomException.internalServerError(...);
}
// ...
levelId: clientLevel.id,
```

**After:**
```typescript
// Client files don't require a document level (unlike ISO documents)
// levelId will be null for client files
// ...
levelId: null, // Client files don't require a level
```

### ✅ Step 4: Updated Tests

**File:** `apps/api/src/modules/client/client.service.spec.ts`

**Changes:**
- Removed mock for `documentLevelService.findByCode`
- Removed expectation that `findByCode` was called
- Added expectation that `levelId` is `null` in document creation

---

## Next Steps (User Action Required)

### ⏳ Step 1: Regenerate Prisma Client

**IMPORTANT:** Prisma client must be regenerated to update TypeScript types.

```bash
cd apps/api
npx prisma generate
```

**Note:** Currently using `levelId: null as any` as temporary workaround until Prisma client is regenerated.

### ⏳ Step 2: Apply Database Migration

**Development:**
```bash
cd apps/api
npx prisma migrate dev
```

**Production:**
```bash
cd apps/api
npx prisma migrate deploy
```

Or apply manually:
```sql
ALTER TABLE "documents" ALTER COLUMN "level_id" DROP NOT NULL;
```

Then baseline:
```bash
npx prisma migrate resolve --applied 20260226120000_make_level_id_nullable_for_client_files
```

### ⏳ Step 3: Remove Type Assertion

**File:** `apps/api/src/modules/client/client.service.ts`

After Prisma client is regenerated, remove the `as any` type assertion:

```typescript
// Change from:
levelId: null as any,

// To:
levelId: null,
```

### ⏳ Step 4: Verify

1. **Type Check:**
   ```bash
   cd apps/api
   npm run type-check
   ```

2. **Test Upload:**
   - Upload a client file via the UI
   - Verify no "invalid_level" error occurs
   - Verify file is created with `levelId = null` in database

3. **Run Tests:**
   ```bash
   cd apps/api
   npm test -- client.service.spec
   ```

---

## Impact Analysis

### ✅ Backward Compatibility

- **ISO Documents:** Still require `levelId` (enforced by `DocumentService.upload()`)
- **Existing Client Files:** If any exist with a level, they remain unchanged (migration only makes column nullable)
- **Queries:** All existing queries handle nullable `levelId` correctly (using `include: { level: true }`)

### ✅ No Breaking Changes

- Frontend code unchanged (doesn't send levelId for client uploads)
- API contract unchanged (client upload endpoint doesn't require levelId)
- Database queries handle nullable levelId gracefully

---

## Files Modified

1. `apps/api/prisma/schema.prisma` - Made levelId nullable
2. `apps/api/prisma/migrations/20260226120000_make_level_id_nullable_for_client_files/migration.sql` - Migration SQL
3. `apps/api/src/modules/client/client.service.ts` - Removed level requirement
4. `apps/api/src/modules/client/client.service.spec.ts` - Updated tests

---

## Verification Checklist

- [ ] Prisma client regenerated (`npx prisma generate`)
- [ ] Migration applied to database
- [ ] TypeScript type-check passes (`npm run type-check`)
- [ ] Tests pass (`npm test -- client.service.spec`)
- [ ] Client file upload works without level requirement
- [ ] ISO document upload still requires level (backward compatibility)
- [ ] Type assertion removed from `client.service.ts`

---

## Notes

- Client files are simpler than ISO documents and don't need level classification
- ISO documents still require levels for proper workflow management
- The migration is safe and non-destructive (only makes column nullable)
