# KPI Tab Implementation Plan

**Created:** 2024-12-22  
**Status:** 🔲 Pending  
**Estimated Duration:** 3-4 days

---

## Overview

Add a new KPI (Key Performance Indicator) tab to the Document Management System. The feature allows users to:

- Track monthly KPI metrics by department
- Input custom KPI titles and targets
- Auto-calculate efficiency percentages and averages
- Visualize data with real-time updating charts
- Export to Excel with table and chart

## Implementation Phases

| Phase | Name              | Status     | Files                                                        |
| ----- | ----------------- | ---------- | ------------------------------------------------------------ |
| 1     | Database Schema   | 🔲 Pending | [phase-01-database-schema.md](./phase-01-database-schema.md) |
| 2     | API Module        | 🔲 Pending | [phase-02-api-module.md](./phase-02-api-module.md)           |
| 3     | Frontend KPI Page | 🔲 Pending | [phase-03-frontend-page.md](./phase-03-frontend-page.md)     |
| 4     | Chart & Export    | 🔲 Pending | [phase-04-chart-export.md](./phase-04-chart-export.md)       |
| 5     | Testing & QA      | 🔲 Pending | [phase-05-testing.md](./phase-05-testing.md)                 |

## Key Requirements

1. **Department Selection**: Dropdown from existing departments list
2. **Editable Fields**:
   - KPI title (e.g., "一﹑梭织转机效率 Hiệu quả chuyển máy dệt thoi")
   - Target value (e.g., "≥85%")
   - Metric rows (user-defined criteria)
3. **Fixed Structure**: 12 monthly columns + average column
4. **Auto-Calculations**: Efficiency = actual/target \* 100, Average of valid months
5. **Real-time Chart**: Updates immediately on data input
6. **Excel Export**: Include table + chart image
7. **CRUD Operations**: Edit mode with Save button

## Technology Stack

- **Database**: PostgreSQL + Prisma (new models: Department, KpiRecord, KpiMetric)
- **Backend**: NestJS module (kpi.module.ts)
- **Frontend**: Next.js page + Chart.js + ExcelJS (already installed)
- **UI**: ShadcnUI components (Table, Input, Button, Dialog)

## Research Documents

- [UI Requirements Analysis](./research/researcher-01-ui-requirements.md)
- [Database & API Architecture](./research/researcher-02-database-api.md)

## Success Criteria

- [ ] User can select department and create KPI records
- [ ] Monthly data input with real-time efficiency calculation
- [ ] Chart updates automatically on data change
- [ ] Excel export includes formatted table and chart
- [ ] Edit/Save functionality works correctly
- [ ] All CRUD operations functional
