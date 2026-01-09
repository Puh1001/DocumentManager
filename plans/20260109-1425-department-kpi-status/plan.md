# Department KPI Status View Implementation

**Created:** 2025-01-09  
**Status:** 🔲 In Progress  
**Estimated Duration:** 2-3 hours

---

## Overview

Tạo giao diện trong boss UI để xem bộ phận nào đã hoàn thành KPI và bộ phận nào chưa. Hiển thị trạng thái completion của tất cả các bộ phận trong một view tổng quan.

## Requirements

1. **Component mới**: `department-kpi-status.tsx`
   - Hiển thị danh sách tất cả departments
   - Hiển thị trạng thái KPI completion cho mỗi department
   - Cho phép filter/sort theo trạng thái
   - Hiển thị số lượng KPI records và completion rate

2. **Logic xác định completion**:
   - Một KPI record được coi là "completed" nếu:
     - Có ít nhất 1 metric với type ACTUAL
     - Metric ACTUAL có ít nhất 1 tháng có giá trị (không null)
   - Một department được coi là "completed" nếu:
     - Tất cả KPI records của department đó đều completed
     - Hoặc có ít nhất 80% KPI records completed (có thể config)

3. **Tích hợp vào Boss UI**:
   - Thêm vào home page của boss UI (khi chưa chọn department)
   - Hoặc thêm như một view option mới

4. **UI/UX**:
   - Hiển thị status badge (completed/incomplete)
   - Progress bar hoặc percentage
   - Color coding (green = completed, yellow = partial, red = incomplete)
   - Click vào department để navigate đến KPI list

## Implementation Phases

| Phase | Name | Status | Files |
| ----- | ---- | ------ | ----- |
| 1 | Component Development | 🔲 Pending | `department-kpi-status.tsx` |
| 2 | Integration | 🔲 Pending | `boss/page.tsx` |
| 3 | Translations | 🔲 Pending | Translation files |
| 4 | Testing | 🔲 Pending | Manual testing |

## Technical Details

### Data Fetching
- Fetch all departments: `GET /api/departments`
- For each department, fetch KPI records: `GET /api/kpi/records?departmentId={id}&year={year}`
- Calculate completion status client-side

### Component Structure
```typescript
interface DepartmentKpiStatus {
  department: Department;
  totalKpis: number;
  completedKpis: number;
  completionRate: number;
  status: 'completed' | 'partial' | 'incomplete';
}
```

### UI Elements
- Grid/Table layout showing departments
- Status badges
- Progress indicators
- Year selector (default: current year - 1)
- Filter options (all/completed/incomplete)

## Files to Create/Modify

1. **New Files**:
   - `apps/web/src/components/boss/department-kpi-status.tsx`

2. **Modified Files**:
   - `apps/web/src/app/[locale]/dashboard/boss/page.tsx` - Add status view option
   - Translation files - Add new keys

## Success Criteria

- ✅ Component displays all departments with KPI status
- ✅ Completion logic correctly identifies completed/incomplete KPIs
- ✅ UI is visually clear and matches cyber theme
- ✅ Integration works seamlessly with existing boss UI
- ✅ Translations are complete
- ✅ No TypeScript/compile errors
