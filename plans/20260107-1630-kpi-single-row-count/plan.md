# KPI Single-Row COUNT Table

**Created:** 2026-01-07 16:30  
**Status:** 🔲 Pending  
**Estimated Duration:** 1-2 hours

---

## Overview

Add option for COUNT tables to have 1 or 2 rows:
- **1 dòng (SINGLE):** Chỉ ACTUAL row
- **2 dòng (DOUBLE):** TARGET + ACTUAL rows

## Requirements

1. Add `rowMode` field: `SINGLE` | `DOUBLE`
2. UI: When selecting COUNT → show radio for row count
3. Table rendering:
   - SINGLE: Show only ACTUAL row
   - DOUBLE: Show TARGET + ACTUAL rows
4. Chart:
   - SINGLE: Only bars (ACTUAL values)
   - DOUBLE: Bars (ACTUAL) + Line (TARGET)

## Implementation Phases

| Phase | Name            | Status     |
| ----- | --------------- | ---------- |
| 1     | Database Schema | 🔲 Pending |
| 2     | Backend API     | 🔲 Pending |
| 3     | Frontend UI     | 🔲 Pending |

## Key Changes

### Database
- Add `rowMode` enum: `SINGLE`, `DOUBLE`
- Add `row_mode` column (nullable, default null for PERCENTAGE)

### Backend
- Update DTOs with rowMode field

### Frontend
- Nested radio selection: COUNT → 1 dòng/2 dòng
- Conditional TARGET row rendering
- Chart logic for SINGLE mode

## Success Criteria

- [ ] COUNT SINGLE: 1 row only (ACTUAL)
- [ ] COUNT DOUBLE: 2 rows (TARGET + ACTUAL)
- [ ] Chart SINGLE: Bars only
- [ ] Chart DOUBLE: Bars + Line
- [ ] PERCENTAGE: Unaffected

