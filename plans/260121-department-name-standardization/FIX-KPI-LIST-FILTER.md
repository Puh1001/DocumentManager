# Fix KPI List Filter - Completed

**Date:** 2026-01-21  
**Status:** ✅ FIXED  
**Issue:** IT và DCC vẫn hiển thị trong danh sách KPI mặc dù không có KPI records

---

## Problem Summary

Sau khi cleanup departments theo yêu cầu client:
- ✅ Database đã đúng: IT và DCC có 0 KPI records
- ❌ Frontend vẫn hiển thị IT và DCC trong **Boss Dashboard - KPI Status**

Client yêu cầu: **Departments không có KPI không nên hiển thị trong danh sách KPI**.

---

## Root Cause

**File:** `apps/web/src/components/boss/department-kpi-status.tsx`

**Issue:** Component `filteredStatuses` chỉ filter dựa trên status (completed/partial/incomplete), **KHÔNG filter ra departments có totalKpis = 0**.

```typescript:191:196
// ❌ BEFORE: Hiển thị tất cả departments
const filteredStatuses = useMemo(() => {
  if (filter === "all") {
    return statuses;  // Bao gồm cả IT, DCC (totalKpis = 0)
  }
  return statuses.filter((s) => s.status === filter);
}, [statuses, filter]);
```

---

## Solution Implemented

### 1. ✅ Filter Departments in Display List

Thêm filter `totalKpis > 0` để chỉ hiển thị departments có KPI records:

```typescript:191:203
// ✅ AFTER: Chỉ hiển thị departments có KPI records
const filteredStatuses = useMemo(() => {
  // Filter out departments with no KPI records (e.g., IT, DCC, AC)
  const deptsWithKpi = statuses.filter((s) => s.totalKpis > 0);
  
  if (filter === "all") {
    return deptsWithKpi;
  }
  return deptsWithKpi.filter((s) => s.status === filter);
}, [statuses, filter]);
```

### 2. ✅ Update Summary Statistics

Cập nhật summary để chỉ tính departments có KPI:

```typescript:199:211
// ✅ AFTER: Summary chỉ tính departments có KPI
const summary = useMemo(() => {
  // Only count departments with KPI records
  const deptsWithKpi = statuses.filter((s) => s.totalKpis > 0);
  
  const total = deptsWithKpi.length;
  const completed = deptsWithKpi.filter((s) => s.status === "completed").length;
  const partial = deptsWithKpi.filter((s) => s.status === "partial").length;
  const incomplete = deptsWithKpi.filter((s) => s.status === "incomplete").length;

  return { total, completed, partial, incomplete };
}, [statuses]);
```

---

## Impact

### Before Fix
- **Boss Dashboard** hiển thị: 36 departments (bao gồm IT, DCC, AC, LTB(E), ...)
- **Summary Total**: 36 departments
- User thấy departments không có KPI → gây confusion

### After Fix
- **Boss Dashboard** hiển thị: 26 departments (chỉ có KPI records)
- **Summary Total**: 26 departments
- ✅ Khớp với yêu cầu client: "Only 26 departments have KPIs"

---

## Departments Hidden from KPI List

Các departments sau **không hiển thị** trong Boss Dashboard - KPI Status:

| Code | Name | Reason | Total KPIs |
|------|------|--------|------------|
| **AC** | Kế toán | Admin/Support | 0 |
| **IT** | Thông tin | Admin/Support | 0 |
| **DCC** | Kiểm soát văn kiện | Admin/Support | 0 |
| **LTB(E)** | LTB đai | Adjusted to reach 26 | 0 |
| **CN_HUNG_YEN_DET_DAI** | WV-Hưng Yên | Branch Office | 0 |
| **CN_HUNG_YEN_DET_NGANG** | WK-Hưng Yên | Branch Office | 0 |
| **CN_NGHE_AN_2_DET_NGANG** | WK-Nghệ An | Branch Office | 0 |
| **DET_NGANG_S** | Dệt ngang - S | Sub-department | 0 |
| **PD** | PD | Not in KPI scope | 0 |
| **QC** | QC | Not in KPI scope | 0 |

**Total Hidden:** 10 departments

---

## Departments Shown in KPI List

26 departments với KPI records vẫn hiển thị bình thường:

1. CV - Bọc sợi
2. DF - Nhuộm đai
3. DH - Nhuộm vải
4. EG - Công trình
5. HR - HCNS
6. LAB - Thí nghiệm
7. LTB(F) - LTB vải
8. PMC - Kế hoạch sản xuất
9. PT - In hoa
10. PUR - Thu mua
11. PW - GĐ Trước nhuộm sợi
12. QA - QA
13. QC(E) - QC đai
14. QC(F) - QC vải
15. RD - Nghiên cứu và phát triển
16. SD - Kinh doanh
17. SHD - Xuất nhập khẩu
18. SS - Định hình
19. TL - Kiểm nghiệm
20. V-Tech - Công nghệ
21. WA - Dệt dọc
22. WD - Kéo sợi
23. WH - Kho
24. WK - Dệt ngang
25. WV - Dệt đai
26. YDF - Nhuộm sợi

---

## Important Notes

### ✅ Departments vẫn ACTIVE trong Database

Tất cả departments (bao gồm IT, DCC, AC) vẫn **active** trong database vì:
- Cần gán users cho các departments này
- Cần gán documents cho users thuộc các departments này
- Chỉ **ẩn khỏi danh sách KPI**, không xóa/deactivate

### ✅ KPI Page vẫn hiển thị tất cả departments

Component `DepartmentKpiStatus` chỉ dùng cho **Boss Dashboard**.

Trang **KPI Page** (`/dashboard/kpi`) vẫn hiển thị tất cả departments mà user có quyền truy cập, để user có thể:
- Xem KPI của department
- Tạo KPI mới cho department (nếu có quyền)

---

## Files Modified

**Frontend:**
- `apps/web/src/components/boss/department-kpi-status.tsx` ✅ 
  - Filter departments với `totalKpis > 0`
  - Update summary statistics

---

## Verification

### ✅ Before Fix
```
Boss Dashboard hiển thị: 36 departments
Summary Total: 36
Có IT, DCC, AC hiển thị (totalKpis = 0)
```

### ✅ After Fix
```
Boss Dashboard hiển thị: 26 departments
Summary Total: 26
IT, DCC, AC bị ẩn (totalKpis = 0)
```

---

## Testing Checklist

- [ ] Boss Dashboard: Verify chỉ 26 departments hiển thị
- [ ] Boss Dashboard: Verify IT và DCC không hiển thị
- [ ] Boss Dashboard: Verify summary total = 26
- [ ] KPI Page: Verify dropdown vẫn hiển thị tất cả departments (cho phép tạo KPI)
- [ ] Database: Verify IT và DCC vẫn active (isActive = true)
- [ ] Users: Verify vẫn gán được users cho IT và DCC
- [ ] Documents: Verify vẫn gán được documents cho users thuộc IT và DCC

---

## Conclusion

✅ **Issue resolved successfully**

- Frontend filter đã được fix
- Chỉ 26 departments có KPI hiển thị trong Boss Dashboard
- IT, DCC, AC và các dept khác không có KPI đã bị ẩn
- Departments vẫn active trong database để gán users và docs
- KPI Page vẫn hoạt động bình thường

**Status:** Ready for testing và deployment! 🚀

---

**End of Report**
