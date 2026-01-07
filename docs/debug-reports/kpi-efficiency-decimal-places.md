# Debug Report: Efficiency (%) Decimal Places

**Date:** 2025-01-XX  
**Issue:** Efficiency (%) chỉ hiển thị số nguyên, cần hiển thị 2 chữ số sau dấu phẩy  
**Severity:** Low  
**Status:** ✅ Fixed

---

## Problem Summary

Efficiency (%) trong bảng KPI hiện tại chỉ hiển thị số nguyên (ví dụ: "12%"), nhưng người dùng muốn hiển thị 2 chữ số sau dấu phẩy (ví dụ: "12.34%").

## Root Cause Analysis

1. **Why is Efficiency displayed as integer?**  
   → Code sử dụng `.toFixed(0)` để format số, làm tròn về số nguyên.

2. **Where is this formatting applied?**  
   → Tại 2 vị trí trong file `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`:
   - Line 1329: Hiển thị giá trị Efficiency theo từng tháng
   - Line 1335: Hiển thị giá trị Efficiency trung bình

3. **Why not use 2 decimal places like other values?**  
   → TARGET và ACTUAL averages đã sử dụng `.toFixed(2)` (lines 1235, 1314), nhưng Efficiency chưa được cập nhật.

## Evidence

### Code Analysis

**File:** `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

**Current Implementation (Lines 1329, 1335):**
```typescript
// Monthly Efficiency values
{v == null ? "" : `${v.toFixed(0)}%`}

// Average Efficiency value  
{efficiencyValues[12] == null ? "" : `${efficiencyValues[12]!.toFixed(0)}%`}
```

**Comparison with other values:**
- TARGET average (line 1235): Uses `.toFixed(2)` ✅
- ACTUAL average (line 1314): Uses `.toFixed(2)` ✅
- Efficiency values (lines 1329, 1335): Uses `.toFixed(0)` ❌

## Fix Plan

1. **Change `.toFixed(0)` to `.toFixed(2)`** tại 2 vị trí:
   - Line 1329: Monthly Efficiency values
   - Line 1335: Average Efficiency value

2. **Verify consistency** với các giá trị khác trong bảng (TARGET, ACTUAL đã dùng 2 chữ số thập phân)

## Solution

Thay đổi format từ `.toFixed(0)` sang `.toFixed(2)` để hiển thị 2 chữ số sau dấu phẩy cho Efficiency (%).

---

## Implementation

✅ **Fixed:** Changed `.toFixed(0)` to `.toFixed(2)` for Efficiency (%) display

