# KPI Dashboard Issues - Scouting Report

## Issues to Address

### Issue 1: KPI Dashboard Year/Month Display
**Problem**: At https://docs.bestpacific.vn/en/dashboard/boss → dashboard → [department] → kpi, the year and month are showing 2025 instead of current year. For example, if current month is July, it should show KPI of June.

### Issue 2: KPI Status Hover Functionality  
**Problem**: At KPI status page, when hovering over departments that haven't completed KPIs, it should highlight which specific KPIs are incomplete.

## Key Files Identified

### Frontend Files (TypeScript/React)

1. **`apps/web/src/app/[locale]/dashboard/kpi/page.tsx`** - Main KPI dashboard page
   - Contains year/month selection logic (lines 216-220)
   - `currentYear = new Date().getFullYear()`
   - `selectedYear = useState(currentYear)` 
   - `selectedMonth = useState<number | null>(() => new Date().getMonth() + 1)`
   - Issue: Shows current month, not previous month

2. **`apps/web/src/components/boss/department-kpi-status.tsx`** - KPI Status page component
   - Contains correct year/month logic for previous month (lines 136-143)
   - Calculates `defaultPrevMonth` and `defaultPrevYear` correctly
   - Shows previous month's data by default
   - Needs hover functionality for incomplete KPIs

3. **`apps/web/src/app/[locale]/dashboard/boss/page.tsx`** - Boss dashboard
   - Navigation to KPI status and department views
   - Contains tabs for departments, KPI status, ISO overview, client files

4. **`apps/web/src/components/boss/kpi-list.tsx`** - KPI list view
   - Could contain hover functionality logic

5. **`apps/web/src/components/boss/kpi-detail.tsx`** - KPI detail view
   - Individual KPI display

### Backend Files

1. **`apps/api/src/modules/kpi/controllers/kpi-record.controller.ts`** - KPI API controller
   - `clearMonth` endpoint for month-specific data deletion (recent fix)
   - `DELETE /kpi/records/:id/months/:month` endpoint

2. **`apps/api/src/modules/kpi/services/kpi-record.service.ts`** - KPI service
   - Business logic for KPI operations

3. **`apps/api/src/modules/kpi/dto/update-kpi-status.dto.ts`** - KPI status DTO
   - Data transfer object for status updates

### Database Schema

1. **`apps/api/prisma/schema.prisma`** - Database schema
   - Contains KPI record and metric models
   - Status field definitions

### Recent Fix

Recent commit: `bd1244a fix(kpi): xoa du lieu theo thang thay vi xoa ca bieu KPI ca nam`
- **Translation**: "fix(kpi): delete data by month instead of deleting entire yearly KPI chart"
- This fix likely addresses month-specific data handling

## Code Analysis

### Issue 1 Root Cause (Year/Month Display)

**KPI Dashboard Page (`page.tsx`)**:
```typescript
const currentYear = new Date().getFullYear();
const [selectedYear, setSelectedYear] = useState(currentYear);
const [selectedMonth, setSelectedMonth] = useState<number | null>(
  () => new Date().getMonth() + 1,
);
```
**Problem**: Shows current year and current month, not previous month.

**KPI Status Page (`department-kpi-status.tsx`)**:
```typescript
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const defaultPrevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
const defaultPrevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
```
**Solution**: Correctly calculates previous month/year.

### Issue 2 Analysis (Hover Functionality)

Current KPI Status page (`department-kpi-status.tsx`) shows:
- Department cards with completion status
- Progress bars for completion rate
- KPI counts (total/completed)

**Missing**: Hover tooltip showing which specific KPIs are incomplete when hovering over departments with incomplete status.

## Files to Modify

### For Issue 1 (Year/Month Display):
1. **`apps/web/src/app/[locale]/dashboard/kpi/page.tsx`** (lines 216-220)
   - Update to use previous month logic like `department-kpi-status.tsx`

### For Issue 2 (Hover Functionality):
1. **`apps/web/src/components/boss/department-kpi-status.tsx`**
   - Add hover state handling
   - Implement tooltip showing incomplete KPI details
   - May need to fetch/show individual incomplete KPI titles

2. **`apps/web/src/lib/api.ts`** 
   - Potentially need new endpoint for fetching incomplete KPIs by department

## Related Files to Review

1. **Translation files**:
   - `apps/web/messages/en/kpi.json` - KPI translations
   - `apps/web/messages/vi/kpi.json` - Vietnamese translations
   - `apps/web/messages/en/boss.json` - Boss dashboard translations

2. **Utility files**:
   - `apps/web/src/lib/kpi-access-helpers.ts` - KPI access control helpers
   - `apps/web/src/lib/utils/kpi-error-handler.ts` - KPI error handling

3. **API files**:
   - `apps/api/src/modules/kpi/dto/create-kpi-record.dto.ts` - KPI creation DTO
   - `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` - Attachment service

## Implementation Notes

### Issue 1 Implementation:
- Copy month/year logic from `department-kpi-status.tsx` to `page.tsx`
- Ensure the logic handles January → December transition correctly
- Test with current date: July 2026 → should show June 2026 KPIs

### Issue 2 Implementation:
- Add `onMouseEnter`/`onMouseLeave` handlers to department cards
- Fetch/show incomplete KPI details on hover
- Consider performance implications for many departments
- UI design: tooltip showing list of incomplete KPI titles

## Unresolved Questions

1. **API endpoints**: Are there existing endpoints to fetch incomplete KPIs by department/month?
2. **Data structure**: What data is needed for hover tooltips (just titles or more details)?
3. **Performance**: How many departments/KPIs typically exist? Need efficient loading.
4. **Design**: What should the hover tooltip look like? Need design specs.

## Summary

**Priority Files**:
1. `apps/web/src/app/[locale]/dashboard/kpi/page.tsx` - Fix year/month display
2. `apps/web/src/components/boss/department-kpi-status.tsx` - Add hover functionality

**Backend Considerations**:
- May need new API endpoint for incomplete KPIs
- Use existing `GET /kpi/records` with filtering

**UI Considerations**:
- Hover tooltip design
- Responsive behavior for mobile