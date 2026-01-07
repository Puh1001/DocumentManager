# KPI Count Table Type Feature

**Created:** 2026-01-07  
**Status:** 🔲 Pending  
**Estimated Duration:** 2-3 hours

---

## Overview

Add ability to choose between **Percentage Table** and **Count Table** when creating KPI records:

- **Percentage Table** (existing): Shows TARGET, ACTUAL, CALCULATED rows with efficiency %
- **Count Table** (new): Shows only TARGET and ACTUAL rows, chart displays actual counts

## Requirements

1. Add `displayType` field to KpiRecord: `PERCENTAGE` | `COUNT`
2. UI selector when adding new table
3. Conditional rendering based on displayType:
   - COUNT: Only show TARGET and ACTUAL rows
   - PERCENTAGE: Show all rows including efficiency
4. Chart behavior for COUNT tables:
   - Bars show ACTUAL values (not percentage)
   - Line shows TARGET values
   - Y-axis adapts to data range (not fixed to 100%)

## Implementation Phases

| Phase | Name            | Status     | Files                                          |
| ----- | --------------- | ---------- | ---------------------------------------------- |
| 1     | Database Schema | 🔲 Pending | [phase-01-schema.md](./phase-01-schema.md)     |
| 2     | Backend API     | 🔲 Pending | [phase-02-api.md](./phase-02-api.md)           |
| 3     | Frontend UI     | 🔲 Pending | [phase-03-frontend.md](./phase-03-frontend.md) |
| 4     | Testing         | 🔲 Pending | [phase-04-testing.md](./phase-04-testing.md)   |

## Key Changes

### Database

- Add `displayType` enum: `PERCENTAGE`, `COUNT`
- Add `displayType` column to `kpi_records` table (default: `PERCENTAGE`)

### Backend

- Update DTOs to include displayType
- Migration to add column

### Frontend

- Add radio/select for displayType when creating table
- Conditional row rendering
- Chart data calculation based on displayType
- Update translations

## Success Criteria

- [ ] User can select displayType when adding new table
- [ ] COUNT tables show only TARGET and ACTUAL rows
- [ ] Chart displays actual counts (not %) for COUNT tables
- [ ] Existing PERCENTAGE tables work as before
- [ ] Export works for both types
