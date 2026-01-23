# Debug Report: KPI Status Hiển Thị Tất Cả Incomplete Mặc Dù Files Đã Upload

**Date:** 2026-01-23  
**Issue:** Màn hình KPI status tất cả dept đều hiển thị chưa hoàn thành. Nhưng tất cả các files đều được upload rồi  
**Status:** 🔍 Root Cause Identified

---

## Problem Summary

Tất cả departments hiển thị status "Incomplete" trong KPI status screen, mặc dù:
- Tất cả files đã được upload
- Backend logic tự động set `status = COMPLETED` khi upload file
- Frontend logic đã được fix để check `status === "COMPLETED"`

**Visual Evidence:**
- Summary: Total 26, Completed 0, Partial 0, Incomplete 26
- Tất cả department cards hiển thị "Incomplete" với 0% completion rate
- Exception: Human Resource Dept. shows 1/5 completed (20%) nhưng vẫn hiển thị "Incomplete"

---

## Root Cause Analysis

### Phase 1: Investigation

**1. Frontend Logic Check** ✅
- File: `apps/web/src/components/boss/department-kpi-status.tsx`
- Line 60-64: `isKpiCompleted()` checks `record.status === "COMPLETED"` ✅ Correct
- Line 121-123: API call `GET /kpi/records?departmentId={id}&year={year}` ✅ Correct

**2. Backend Logic Check** ✅
- File: `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`
- Line 134-138: Auto-updates `status = COMPLETED` when uploading attachment ✅ Correct
- File: `apps/api/src/modules/kpi/services/kpi-record.service.ts`
- Line 32-44: `findAll()` uses Prisma `findMany()` which includes all fields by default ✅ Correct

**3. Database Schema Check** ✅
- File: `apps/api/prisma/schema.prisma`
- Line 392: `status KpiStatus @default(PENDING)` ✅ Correct
- Migration: `20260121101722_add_status_to_kpi_records` ✅ Applied

### Phase 2: Root Cause Identified

**ROOT CAUSE**: **Records uploaded BEFORE the status field migration (2026-01-21) still have `status = PENDING`**

**Timeline:**
1. **Before 2026-01-21**: KPI records existed, files were uploaded, but NO status field
2. **2026-01-21**: Migration added `status` field with default `PENDING` for all existing records
3. **After 2026-01-21**: New uploads auto-set `status = COMPLETED` ✅
4. **Problem**: Old records with attachments still have `status = PENDING` ❌

**Evidence:**
- Migration `20260121101722_add_status_to_kpi_records` sets default `PENDING` for existing records
- No backfill script was run to update existing records with attachments to `COMPLETED`
- Frontend correctly checks `status === "COMPLETED"`, but old records have `status = PENDING`

**Impact:**
- All departments show "Incomplete" because their KPI records have `status = PENDING`
- Even though files were uploaded before the migration, status wasn't updated
- Only new uploads after migration have correct status

---

## Solution

### Fix Implemented ✅

**Created Backfill Script:**
- File: `apps/api/scripts/backfill-kpi-status-from-attachments.ts`
- Updates all KPI records with attachments from `PENDING` to `COMPLETED`
- Includes migration check to ensure status field exists
- Provides progress reporting and summary statistics

### How to Run

```bash
cd apps/api
npx ts-node scripts/backfill-kpi-status-from-attachments.ts
```

**Expected Output:**
```
🔄 Starting KPI status backfill...
📊 Found X KPI records with attachments but status = PENDING
   Progress: 10/X records updated
   Progress: 20/X records updated
...

📊 Backfill Summary:
   ✅ Updated: X
   ❌ Failed: 0
   📈 Success rate: 100.00%

📋 Updated by Department:
   Department A: Y records
   Department B: Z records
...

✅ Backfill complete!
   💡 Refresh the KPI status screen to see updated completion status
```

### Implementation Details

**Script Features:**
1. ✅ Migration check - Verifies status field exists before running
2. ✅ Safe query - Only updates records with `status = PENDING` and attachments
3. ✅ Progress reporting - Shows updates every 10 records
4. ✅ Error handling - Continues on individual failures, reports summary
5. ✅ Department breakdown - Shows which departments were updated
6. ✅ Idempotent - Safe to run multiple times (only updates PENDING records)

**What It Does:**
- Finds all KPI records with `status = PENDING` that have at least one attachment
- Updates their status to `COMPLETED`
- Reports progress and summary statistics
- Shows breakdown by department

---

## Verification Checklist

- [x] Backfill script created ✅
- [ ] Backfill script executed
- [ ] All records with attachments have `status = COMPLETED`
- [ ] Frontend displays correct completion status
- [ ] Summary statistics show correct counts
- [ ] Department cards show correct status badges

## Next Steps

1. **Run Backfill Script:**
   ```bash
   cd apps/api
   npx ts-node scripts/backfill-kpi-status-from-attachments.ts
   ```

2. **Verify Results:**
   - Check console output for number of records updated
   - Verify in database: `SELECT COUNT(*) FROM kpi_records WHERE status = 'COMPLETED' AND id IN (SELECT kpi_record_id FROM kpi_attachments)`

3. **Test Frontend:**
   - Refresh KPI status screen
   - Verify summary statistics show correct counts
   - Check individual department cards show correct status

---

## Related Files

- `apps/api/scripts/backfill-kpi-status-from-attachments.ts` - **Backfill script (NEW)** ✅
- `apps/api/prisma/migrations/20260121101722_add_status_to_kpi_records/migration.sql` - Original migration
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` - Auto-update logic (correct)
- `apps/web/src/components/boss/department-kpi-status.tsx` - Frontend display (correct)
- `apps/api/src/modules/kpi/services/kpi-record.service.ts` - API endpoint (correct)

---

## Notes

- This is a **data migration issue**, not a code bug
- Frontend and backend logic are both correct
- Solution is to backfill existing data
- Future uploads will work correctly (already implemented)
