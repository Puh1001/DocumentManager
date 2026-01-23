# KPI Completion Status Bug Fix

**Date:** 2026-01-22  
**Issue:** KPI completion status showing incorrect count  
**Status:** ✅ Fixed

## Problem Summary

Ở HR năm 2025 đã upload đủ hết các file của 5 KPI và 2026 chỉ upload 1 trong 5 KPI nhưng ở status lại hiển thị tổng 5 KPI và hoàn thành 4. Điều này không hợp lý vì điều kiện mới là chỉ cần upload files là tính hoàn thành, không còn cần điền thông số nữa.

## Root Cause Analysis

### Phase 1: Investigation

1. **Backend Logic**: ✅ Correct
   - `KpiAttachmentService.uploadAttachment()` tự động set `status = COMPLETED` khi upload file
   - Database schema có field `status` với enum `KpiStatus` (PENDING, IN_PROGRESS, COMPLETED)

2. **Frontend Logic**: ❌ Incorrect
   - Function `isKpiCompleted()` trong `department-kpi-status.tsx` đang check **metrics** thay vì check **status**
   - Logic cũ: KPI completed nếu có bất kỳ metric nào có dữ liệu (value != null)
   - Logic mới (theo yêu cầu): KPI completed nếu `status === COMPLETED` (tức là đã upload file)

### Phase 2: Root Cause

**Root Cause**: Frontend `isKpiCompleted()` function đang sử dụng logic cũ (check metrics) thay vì logic mới (check status field).

**Evidence**:
- File: `apps/web/src/components/boss/department-kpi-status.tsx`
- Lines 58-72: Function `isKpiCompleted()` check metrics thay vì status
- Interface `KpiRecord` (lines 15-21) không có field `status`

**Impact**:
- Với năm 2026: Chỉ 1 KPI có file upload → status = COMPLETED
- Nhưng 4 KPI khác có metrics data → frontend tính là completed
- Kết quả: Hiển thị 4 completed thay vì 1 completed

## Solution

### Changes Made

1. **Updated KpiRecord Interface** (`department-kpi-status.tsx`):
   ```typescript
   interface KpiRecord {
     id: string;
     departmentId: string;
     year: number;
     title: string;
     status?: "PENDING" | "IN_PROGRESS" | "COMPLETED"; // ✅ Added
     metrics?: KpiMetric[];
   }
   ```

2. **Fixed isKpiCompleted Function** (`department-kpi-status.tsx`):
   ```typescript
   // ❌ Old logic (check metrics):
   function isKpiCompleted(record: KpiRecord): boolean {
     if (!record.metrics || record.metrics.length === 0) {
       return false;
     }
     return record.metrics.some((metric) =>
       MONTH_KEYS.some((key) => {
         const value = metric.values?.[key];
         return value != null;
       })
     );
   }

   // ✅ New logic (check status):
   function isKpiCompleted(record: KpiRecord): boolean {
     // KPI được coi là hoàn thành nếu status === COMPLETED
     // Status được tự động set thành COMPLETED khi upload file (backend)
     return record.status === "COMPLETED";
   }
   ```

### Files Modified

- `apps/web/src/components/boss/department-kpi-status.tsx`
  - Added `status` field to `KpiRecord` interface
  - Updated `isKpiCompleted()` to check `status === "COMPLETED"` instead of metrics

## Verification

### Backend Verification
- ✅ Backend `findAll()` method uses Prisma `findMany()` which includes all fields by default
- ✅ `status` field is part of `KpiRecord` model in schema
- ✅ `status` field is automatically set to `COMPLETED` when file is uploaded

### Expected Behavior After Fix

**For 2025 (HR)**:
- 5 KPIs với files uploaded → status = COMPLETED
- Frontend sẽ hiển thị: Total 5, Completed 5 ✅

**For 2026 (HR)**:
- 1 KPI với file uploaded → status = COMPLETED
- 4 KPIs không có file → status = PENDING
- Frontend sẽ hiển thị: Total 5, Completed 1 ✅

## Testing Recommendations

1. **Manual Testing**:
   - Check HR department status for 2025 (should show 5/5 completed)
   - Check HR department status for 2026 (should show 1/5 completed)
   - Verify status updates correctly when files are uploaded/deleted

2. **Edge Cases**:
   - KPI với status = IN_PROGRESS (manual override) → should not count as completed
   - KPI với status = PENDING → should not count as completed
   - KPI với status = COMPLETED → should count as completed

## Related Files

- `apps/web/src/components/boss/department-kpi-status.tsx` - Fixed
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` - Backend logic (already correct)
- `apps/api/src/modules/kpi/services/kpi-record.service.ts` - Backend API (already correct)
- `apps/api/prisma/schema.prisma` - Database schema (already correct)

## Notes

- Logic mới đơn giản hơn: chỉ cần check `status === "COMPLETED"`
- Không cần check metrics nữa vì điều kiện mới là "chỉ cần upload files là tính hoàn thành"
- Backend đã implement đúng logic này từ trước (auto-set status = COMPLETED khi upload file)
