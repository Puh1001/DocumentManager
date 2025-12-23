# Phase 3: Frontend KPI Page

**Parent Plan:** [plan.md](./plan.md)  
**Dependencies:** Phase 2 (API Module)  
**Status:** 🔲 Pending  
**Priority:** High

---

## Overview

Create Next.js page for KPI management with editable table and real-time chart.

## Requirements

1. New navigation item in sidebar
2. Department selector dropdown
3. Editable KPI table matching the design
4. Real-time chart updates
5. Edit/Save mode toggle
6. Add/Delete metric rows

## Architecture

### File Structure

```
apps/web/src/
├── app/dashboard/kpi/
│   └── page.tsx              # Main KPI page
├── components/kpi/
│   ├── department-selector.tsx
│   ├── kpi-table.tsx
│   ├── kpi-chart.tsx
│   ├── kpi-metric-row.tsx
│   └── kpi-toolbar.tsx
├── hooks/
│   └── use-kpi.ts            # KPI data hooks
└── types/
    └── kpi.ts                # TypeScript interfaces
```

### Component Hierarchy

```
KpiPage
├── DepartmentSelector
├── KpiToolbar (Edit, Save, Export, Add Row)
├── KpiTable
│   ├── KpiHeader (Title, Target input)
│   ├── KpiMetricRow (per row)
│   └── KpiEfficiencyRow (calculated)
└── KpiChart
```

## Related Files

- `apps/web/src/components/layout/sidebar.tsx` - Add KPI nav item
- `apps/web/src/app/dashboard/kpi/page.tsx` - New page
- `apps/web/src/components/kpi/*` - New components
- `apps/web/src/lib/api.ts` - Existing API client

## Implementation Steps

- [x] Add "KPI" navigation item to sidebar.tsx
- [x] Create kpi/page.tsx with basic layout
- [x] Create TypeScript interfaces (Department, KpiRecord, KpiMetric)
- [x] Implement editable table with monthly columns
- [x] Implement calculation logic in frontend
- [x] Implement edit mode state management
- [x] Add save functionality
- [x] Style with Tailwind to match design

## Key Implementation Details

### Table Structure (matching design)

```tsx
<table className="w-full border-collapse">
  <thead>
    <tr>
      <th>月份 Tháng</th>
      <th>1月份 Tháng 1</th>
      {/* ... months 2-12 ... */}
      <th>平均达成率 Trung bình</th>
    </tr>
  </thead>
  <tbody>
    {metrics.map(metric => (
      <KpiMetricRow key={metric.id} metric={metric} />
    ))}
    <KpiEfficiencyRow targetMetric={...} actualMetric={...} />
  </tbody>
</table>
```

### State Management

```typescript
interface KpiPageState {
  selectedDepartment: string | null;
  record: KpiRecord | null;
  isEditMode: boolean;
  isSaving: boolean;
}
```

### Editable Cell Component

```tsx
<Input
  type="number"
  value={value}
  onChange={(e) => onValueChange(month, e.target.value)}
  disabled={!isEditMode}
  className="w-20 text-center"
/>
```

## UI Design Notes

- Header: Blue background for "月份/Tháng" header
- Cell borders: Thin gray borders
- Input alignment: Center-aligned numbers
- Row labels: Chinese + Vietnamese bilingual
- Edit mode: Enable input fields, show Save button
- View mode: Disable input fields, show Edit button

## Success Criteria

- [ ] Page loads with department selector
- [ ] Table displays all monthly columns
- [ ] Edit mode enables/disables inputs
- [ ] Save persists data to API
- [ ] UI matches provided design images

## Todo List

- [ ] Add sidebar navigation
- [ ] Create page layout
- [ ] Implement department selector
- [ ] Build editable table
- [ ] Add metric row CRUD
- [ ] Style to match design
- [ ] Test edit/save flow
