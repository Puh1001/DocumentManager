# Phase 01: Fix KPI Dashboard Year/Month Display

**Date**: 2026-07-13
**Priority**: 1
**Status**: In Progress

## Context Links
- [Main Plan](../plan.md)
- [Scout Report](../../scout-report-kpi-issues.md)

## Overview
Fix the KPI dashboard to show current year and previous month (e.g., July 2026 → show June 2026 KPIs).

## Key Insights
1. Current code in `page.tsx` shows current year/month
2. `department-kpi-status.tsx` has correct previous month logic
3. Need to copy and adapt the logic

## Requirements
1. Show current year (not 2025)
2. Show previous month (July → June, January → December of previous year)
3. Maintain existing functionality
4. Preserve month/year selector dropdowns

## Related Code Files
1. `apps/web/src/app/[locale]/dashboard/kpi/page.tsx` (lines 216-220) - Target file
2. `apps/web/src/components/boss/department-kpi-status.tsx` (lines 136-143) - Reference implementation

## Implementation Steps

### Step 1: Update Year/Month Logic
Replace current logic (lines 216-220):
```typescript
const currentYear = new Date().getFullYear();
const [selectedYear, setSelectedYear] = useState(currentYear);
const [selectedMonth, setSelectedMonth] = useState<number | null>(
  () => new Date().getMonth() + 1,
);
```

With previous month logic:
```typescript
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const defaultPrevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
const defaultPrevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
const [selectedYear, setSelectedYear] = useState(defaultPrevYear);
const [selectedMonth, setSelectedMonth] = useState<number | null>(defaultPrevMonth);
```

### Step 2: Verify Month Selector
Check month selector dropdown shows correct month labels.

### Step 3: Test Functionality
Test with current date to ensure correct month/year display.

## Todo List
- [ ] Update year/month logic in `page.tsx`
- [ ] Test with current date
- [ ] Verify month/year dropdowns work correctly
- [ ] Check all KPI functionality still works

## Success Criteria
1. KPI dashboard shows current year (2026) not 2025
2. Shows previous month (July → June)
3. Month/year selectors work correctly
4. All existing KPI functionality preserved

## Risk Assessment
- **Low risk**: Simple logic change
- **No breaking changes**: UI-only modification
- **Test thoroughly**: Ensure month/year calculations work for edge cases (January → December)

## Next Steps
Proceed to Phase 02 after successful implementation and testing.