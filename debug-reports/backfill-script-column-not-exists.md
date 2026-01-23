# Debug Report: Backfill Script Fails - Column Does Not Exist

**Date:** 2026-01-22  
**Issue:** Backfill script fails with "column `documents.uploaded_by` does not exist"  
**Status:** 🔍 **ROOT CAUSE IDENTIFIED**

---

## Problem Summary

**Error:**
```
The column `documents.uploaded_by` does not exist in the current database.
```

**When:** Running `npx ts-node apps/api/scripts/backfill-deletion-tracking.ts`

---

## Root Cause

**Issue:** Migration chưa được apply vào database.

**Problem Flow:**
1. Migration file đã được tạo: `20260122120000_add_deletion_tracking_and_requests/migration.sql`
2. Migration đã được mark là "applied" (có thể do `prisma migrate resolve`)
3. Nhưng SQL migration chưa thực sự chạy trên database
4. Column `uploaded_by` chưa tồn tại
5. Backfill script query `uploadedBy: null` → FAILS

**Evidence:**
- `prisma migrate status` shows "Database schema is up to date!"
- But error says column doesn't exist
- Migration file exists but SQL hasn't been executed

---

## Solution

**Option 1: Apply Migration First (Recommended)**
```bash
# Apply migration to database
cd apps/api
npx prisma migrate deploy

# Then run backfill
npx ts-node scripts/backfill-deletion-tracking.ts
```

**Option 2: Make Backfill Script Migration-Aware**
- Check if columns exist before querying
- Use raw SQL if columns don't exist
- Or skip gracefully with warning

**Recommended: Option 1** - Proper order: Migration → Backfill

---

## Fix Plan

### Immediate Fix

1. **Apply migration first:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Then run backfill:**
   ```bash
   npx ts-node scripts/backfill-deletion-tracking.ts
   ```

### Long-term Fix (Optional)

Update backfill script to check if migration has been applied:

```typescript
// Check if columns exist before running
const checkMigrationApplied = async () => {
  try {
    // Try to query with new columns
    await prisma.$queryRaw`SELECT uploaded_by FROM documents LIMIT 1`;
    return true;
  } catch (error) {
    if (error.code === 'P2022') {
      console.error('❌ Migration not applied! Please run: npx prisma migrate deploy');
      return false;
    }
    throw error;
  }
};

async function backfillDeletionTracking() {
  const migrationApplied = await checkMigrationApplied();
  if (!migrationApplied) {
    process.exit(1);
  }
  
  // ... rest of script
}
```

---

## Files to Fix

1. **Deployment Order:**
   - ✅ Migration must run BEFORE backfill script
   - Update deployment checklist to emphasize order

2. **Backfill Script (Optional Enhancement):**
   - Add migration check at start
   - Fail gracefully with clear error message

---

## Expected Behavior After Fix

1. Run `npx prisma migrate deploy` → Columns created ✅
2. Run backfill script → Successfully queries and updates ✅
3. Documents have `uploaded_by`, `uploaded_at`, `deletion_expires_at` ✅

---

## Status

✅ **FIXED** - Backfill script now checks migration status before running

**Implementation:**
- Added `checkMigrationApplied()` function
- Checks if `uploaded_by` column exists before querying
- Fails gracefully with clear error message if migration not applied
- Prevents confusing errors

**Files Modified:**
1. `apps/api/scripts/backfill-deletion-tracking.ts`
   - Added migration check at start
   - Clear error message if migration not applied

**Deployment Order (CRITICAL):**
1. ✅ Run migration: `npx prisma migrate deploy`
2. ✅ Then run backfill: `npx ts-node scripts/backfill-deletion-tracking.ts`

**Expected Behavior:**
- If migration not applied → Script exits with clear error ✅
- If migration applied → Script runs normally ✅
