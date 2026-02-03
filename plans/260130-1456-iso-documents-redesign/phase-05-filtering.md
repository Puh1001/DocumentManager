# Phase 05: Filtering Enhancement

## Context Links

- Parent: [plan.md](plan.md)
- Depends on: [phase-03-frontend-display.md](phase-03-frontend-display.md)
- Research: [researcher-02-report.md](research/researcher-02-report.md)
- Component: `apps/web/src/components/documents/document-toolbar.tsx`

## Overview

- **Date:** 2026-01-30
- **Priority:** Medium
- **Description:** Enable Level filter with actual data. Add optional user and date filters.
- **Implementation status:** Done
- **Review status:** Done ([phase-05-code-review.md](reports/phase-05-code-review.md))

## Key Insights

- Level filter exists but not functional (no data)
- Need to populate Level dropdown with available levels
- Optional: Add preparer/reviewer/approver filters
- Optional: Add date range filters

## Requirements

### Functional

- Populate Level filter dropdown with available levels
- Enable Level filtering in API call
- Optional: Add preparer filter dropdown
- Optional: Add reviewer filter dropdown
- Optional: Add approver filter dropdown
- Optional: Add date range filters

### Non-Functional

- Filter dropdowns should be searchable
- Follow existing filter patterns
- Support clearing filters
- Maintain filter state in URL (optional)

## Architecture

### Filter Updates

```typescript
// DocumentToolbar component
interface FilterState {
  status: string;
  departmentId: string;
  level: string; // Now functional
  preparerId?: string; // Optional
  reviewerId?: string; // Optional
  approverId?: string; // Optional
  approvalDateFrom?: Date; // Optional
  approvalDateTo?: Date; // Optional
  receiptDateFrom?: Date; // Optional
  receiptDateTo?: Date; // Optional
}
```

### Level Filter

- Fetch distinct levels from API or use predefined list
- Populate dropdown with available levels
- Include "All Levels" option
- Filter documents by selected level

### User Filters (Optional)

- Fetch users list
- Create searchable dropdowns
- Filter by preparer/reviewer/approver ID

### Date Filters (Optional)

- Date range pickers
- Filter by approval date range
- Filter by receipt date range

## Related Code Files

### Files to Modify

- `apps/web/src/components/documents/document-toolbar.tsx` - Update filters
- `apps/web/src/app/[locale]/dashboard/documents/page.tsx` - Handle filter changes
- `apps/api/src/modules/storage/services/document.service.ts` - Add filter logic

### Files to Create

- `apps/api/src/modules/storage/controllers/document.controller.ts` - Add levels endpoint (optional)

## Implementation Steps

1. **Backend: Get Available Levels**
   - Option A: Add `GET /storage/documents/levels` endpoint
   - Option B: Fetch distinct levels from existing documents
   - Option C: Use predefined list (if levels are enum)

2. **Update DocumentToolbar Component**
   - Fetch available levels
   - Populate Level dropdown
   - Enable Level filter functionality
   - Add optional user filters (if needed)
   - Add optional date filters (if needed)

3. **Update API Call**
   - Include level in query params
   - Include user filters (if added)
   - Include date filters (if added)

4. **Update Service Filtering**
   - Enable level filtering in backend
   - Add user ID filtering (if needed)
   - Add date range filtering (if needed)

5. **Test Filtering**
   - Test Level filter with different values
   - Test clearing filters
   - Test multiple filters together
   - Test with no results

## Todo List

- [x] Decide on levels source (use existing GET /storage/document-levels)
- [x] Fetch available levels in frontend (documents page)
- [x] Populate Level dropdown (DocumentToolbar with levels + locale)
- [x] Enable Level filtering (API param `level` already sent; backend filters by levelId)
- [ ] Test Level filter (manual)
- [ ] Add user filters (optional, deferred)
- [ ] Add date filters (optional, deferred)
- [ ] Test all filters together

## Success Criteria

- Level filter dropdown is populated with actual data
- Level filtering works correctly
- Filters can be cleared
- Multiple filters work together
- No performance issues with filtering

## Risk Assessment

### Risks

- **Performance:** Filtering large datasets
- **Level values:** Need consistent level values

### Mitigations

- Use database indexes for filtering
- Validate level values
- Limit filter combinations if needed

## Security Considerations

- No security concerns for filtering
- User filters only show users user has access to
- Date filters are read-only

## Next Steps

- Proceed to Phase 06: Testing & Documentation
- Write tests for all features
- Update documentation
