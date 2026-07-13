# Phase 02: Add Hover Tooltip for Incomplete KPIs

**Date**: 2026-07-13
**Priority**: 2
**Status**: Pending

## Context Links
- [Main Plan](../plan.md)
- [Phase 01](phase-01-fix-year-month-display.md)
- [Scout Report](../../scout-report-kpi-issues.md)

## Overview
Add hover functionality to KPI status page to show incomplete KPI details when hovering over departments.

## Key Insights
1. Current department-kpi-status.tsx shows department cards with completion status
2. Need to fetch and display incomplete KPI details on hover
3. API endpoints exist for fetching KPI records and attachments
4. KPI completion is determined by attachment presence for selected month

## Requirements
1. Hover over department card → show incomplete KPI details
2. Show list of incomplete KPI titles
3. Optional: Show KPI completion status per KPI
4. Responsive tooltip design
5. Performance: Lazy load incomplete KPI details

## Related Code Files
1. `apps/web/src/components/boss/department-kpi-status.tsx` - Main component
2. `apps/web/src/lib/api.ts` - API client
3. `apps/web/messages/en/boss.json` - Translations
4. `apps/web/messages/vi/boss.json` - Vietnamese translations

## Implementation Steps

### Step 1: Analyze Current Data Flow
- Department cards show aggregated completion status
- KPI records are fetched by department/year
- Completion is based on attachments for selected month

### Step 2: Add Hover State Management
Add state for:
- Hovered department ID
- Incomplete KPI details for hovered department
- Loading state for incomplete KPIs

### Step 3: Implement Hover Handlers
Add to department card:
- `onMouseEnter`: Fetch incomplete KPIs for department
- `onMouseLeave`: Clear hover state
- `onFocus`/`onBlur` for accessibility

### Step 4: Create Tooltip Component
Create tooltip showing:
- Department name
- List of incomplete KPI titles
- Count of incomplete vs total KPIs
- Optional: Link to view department KPIs

### Step 5: Fetch Incomplete KPI Details
Use existing API endpoints:
- `GET /kpi/records?departmentId={id}&year={year}`
- `GET /kpi/attachments?kpiRecordId={id}&month={month}`

Filter records without attachments for selected month.

### Step 6: Styling and UX
- Cyberpunk design consistent with existing UI
- Smooth animations for tooltip appearance
- Responsive positioning
- Accessibility support

## Todo List
- [ ] Analyze current KPI data structure
- [ ] Add hover state to department-kpi-status.tsx
- [ ] Implement incomplete KPI fetching logic
- [ ] Create tooltip component
- [ ] Add hover handlers to department cards
- [ ] Style tooltip with cyberpunk theme
- [ ] Test hover functionality
- [ ] Verify accessibility

## Success Criteria
1. Hovering over department card shows incomplete KPI details
2. Tooltip displays list of incomplete KPI titles
3. Performance: Tooltip appears quickly without lag
4. All existing functionality preserved
5. Accessible via keyboard navigation

## Risk Assessment
- **Medium risk**: New hover functionality
- **Performance**: Lazy loading required to avoid API spam
- **UX**: Tooltip positioning and timing important
- **Testing**: Need to test with various screen sizes

## Next Steps
Proceed to implementation after Phase 01 verification.