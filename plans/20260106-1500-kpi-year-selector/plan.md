# Plan: KPI Year Selector

**Created:** 2026-01-06 15:00  
**Status:** 🔄 In Progress  
**Priority:** P1 - High

---

## Overview

Add year selector to KPI page so users can select which year to view/edit. Currently hardcoded to current year. User needs to input KPI for 2025.

## Current State

**Frontend (`apps/web/src/app/[locale]/dashboard/kpi/page.tsx`):**

- Line 127: `const year = new Date().getFullYear();` - Hardcoded
- Line 743: Displays year as text only
- No year selector UI

**Backend:**

- ✅ API already supports year filtering via query param
- ✅ Controller accepts `?year=2025` parameter
- ✅ Service filters by year correctly

## Solution

Add year dropdown selector in frontend:

1. Replace constant `year` with state `selectedYear`
2. Add year selector dropdown (2020-2030 range)
3. Pass year param to all API calls
4. Default to current year for backward compatibility

## Changes

### File to Modify

- `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

### Implementation

```typescript
// Change from:
const year = new Date().getFullYear();

// To:
const currentYear = new Date().getFullYear();
const [selectedYear, setSelectedYear] = useState(currentYear);

// Add year selector UI next to department selector

// Update API calls to include year:
`/kpi/records?departmentId=${id}&year=${selectedYear}`;
```

## UI Location

Add year selector in header (line 724 area), next to department selector.

## Year Range

- Default: Current year
- Range: 2020 - 2030 (11 years)
- User can select any year in range

## Success Criteria

- [ ] Year selector dropdown visible
- [ ] Defaults to current year
- [ ] Can select 2025
- [ ] KPI data loads for selected year
- [ ] Create/Edit/Delete works for selected year
- [ ] Auto-create uses selected year
