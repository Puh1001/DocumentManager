# Debug Report: Chart Không Hiển Thị Với Giá Trị Rất Nhỏ (0.0x%)

**Date:** 2025-01-XX  
**Issue:** Khi đồ thị chỉ có giá trị 0.0x% (ví dụ 0.02%) thì không thể hiển thị được  
**Severity:** Medium  
**Status:** ✅ Fixed

---

## Problem Summary

Khi Efficiency (%) có giá trị rất nhỏ (ví dụ 0.02%), đồ thị không hiển thị được vì bars quá nhỏ, gần như không nhìn thấy.

## Root Cause Analysis (5 Whys)

1. **Why can't we see the bars?**  
   → Bars quá nhỏ so với scale của đồ thị, chỉ chiếm < 1% chiều cao chart.

2. **Why are bars so small?**  
   → Scale max được set quá lớn so với giá trị thực tế (ví dụ: giá trị 0.02% nhưng scale max = 5%).

3. **Why is scale max too large?**  
   → Logic ở line 572-577 force minimum scale: nếu maxValue < 5 thì đảm bảo ít nhất 5% scale, nếu < 10 thì ít nhất 10% scale.

4. **Why force minimum scale?**  
   → Code cố gắng đảm bảo bars luôn nhìn thấy được, nhưng logic này không phù hợp với giá trị rất nhỏ (< 1%).

5. **Why doesn't it work for very small values?**  
   → Với giá trị 0.02% và scale max = 5%, bar chỉ cao 0.02/5 = 0.4% của chart height, gần như vô hình.

## Evidence

### Code Analysis

**File:** `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

**Problematic Logic (Lines 572-577):**
```typescript
if (maxWithTarget < 5 && dataRange < 2) {
  // For very small ranges (< 5% with range < 2%), ensure at least 5% scale
  dynamicMax = Math.max(dynamicMax, 5);
} else if (maxWithTarget < 10) {
  // For small values (< 10%), ensure at least 10% scale
  dynamicMax = Math.max(dynamicMax, 10);
}
```

**Example Calculation:**
- maxValue = 0.02 (0.02%)
- paddingPercent = 0.5 (50% padding)
- dynamicMax = 0.02 * 1.5 = 0.03
- Check: maxWithTarget (0.02) < 5 → true
- dynamicMax = Math.max(0.03, 5) = **5**
- Result: Scale 0-5%, bar height = 0.02/5 = **0.4% of chart** → Invisible!

## Fix Plan

1. **Adjust logic for very small values (< 1%):**
   - Không force minimum scale 5% hoặc 10% cho giá trị < 1%
   - Sử dụng padding dựa trên giá trị thực tế
   - Đảm bảo bars có chiều cao tối thiểu có thể nhìn thấy (ít nhất 5-10% của chart height)

2. **New logic:**
   - Nếu maxValue < 1%: Sử dụng padding lớn hơn (100-200%) và không force minimum
   - Nếu maxValue >= 1% và < 5%: Giữ logic hiện tại nhưng điều chỉnh
   - Nếu maxValue >= 5%: Giữ logic hiện tại

3. **Ensure bars are visible:**
   - Với giá trị 0.02%, scale max nên là ~0.05-0.1 (2-5x giá trị)
   - Điều này đảm bảo bar cao ít nhất 20-40% của chart height

## Solution

Cập nhật logic tính toán `dynamicMax` trong `getChartOptions` để xử lý tốt hơn các giá trị rất nhỏ (< 1%).

---

## Implementation

✅ **Fixed:** Adjusted chart scale calculation for very small values (< 1%)

### Changes Made

1. **Enhanced padding for very small values:**
   - Giá trị < 1%: Padding 200% (thay vì 50%)
   - Giá trị 1-10%: Padding 50% (giữ nguyên)
   - Giá trị >= 10%: Padding 20-30% (giữ nguyên)

2. **Removed forced minimum scale for very small values:**
   - Không force minimum 5% hoặc 10% cho giá trị < 1%
   - Cho phép scale tự tính toán dựa trên giá trị thực tế với padding

3. **Improved rounding logic:**
   - Giá trị < 0.1%: Round to nearest 0.01
   - Giá trị 0.1-1%: Round to nearest 0.05
   - Giá trị 1-10%: Round to nearest 0.5
   - Giá trị >= 10%: Round to nearest 5 hoặc 10

### Example Calculation

**Before (0.02% value):**
- maxValue = 0.02
- paddingPercent = 0.5 (50%)
- dynamicMax = 0.02 * 1.5 = 0.03
- Force minimum: dynamicMax = Math.max(0.03, 5) = **5**
- niceMax = 5
- Bar height = 0.02/5 = **0.4% of chart** → Invisible ❌

**After (0.02% value):**
- maxValue = 0.02
- paddingPercent = 2.0 (200%)
- dynamicMax = 0.02 * 3 = 0.06
- No forced minimum (vì < 1%)
- niceMax = 0.06
- Bar height = 0.02/0.06 = **33% of chart** → Visible ✅

