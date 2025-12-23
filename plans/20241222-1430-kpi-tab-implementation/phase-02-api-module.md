# Phase 2: API Module

**Parent Plan:** [plan.md](./plan.md)  
**Dependencies:** Phase 1 (Database Schema)  
**Status:** 🔲 Pending  
**Priority:** High

---

## Overview

Create NestJS module for KPI management with full CRUD operations.

## Requirements

1. Department endpoints (list, create)
2. KPI Record CRUD endpoints
3. KPI Metric CRUD endpoints
4. Excel export endpoint
5. Calculation logic for efficiency and average

## Architecture

### Module Structure

```
apps/api/src/modules/kpi/
├── kpi.module.ts
├── controllers/
│   ├── department.controller.ts
│   ├── kpi-record.controller.ts
│   └── kpi-export.controller.ts
├── services/
│   ├── department.service.ts
│   ├── kpi-record.service.ts
│   ├── kpi-metric.service.ts
│   └── kpi-export.service.ts
└── dto/
    ├── create-department.dto.ts
    ├── create-kpi-record.dto.ts
    ├── update-kpi-record.dto.ts
    ├── create-kpi-metric.dto.ts
    └── update-kpi-metric.dto.ts
```

### API Endpoints

```
# Departments
GET    /api/kpi/departments           # List all departments
POST   /api/kpi/departments           # Create department

# KPI Records
GET    /api/kpi/records               # List records (query: departmentId, year)
GET    /api/kpi/records/:id           # Get record with metrics
POST   /api/kpi/records               # Create record
PATCH  /api/kpi/records/:id           # Update record (title, target)
DELETE /api/kpi/records/:id           # Delete record

# KPI Metrics
POST   /api/kpi/metrics               # Add metric to record
PATCH  /api/kpi/metrics/:id           # Update metric values
DELETE /api/kpi/metrics/:id           # Delete metric

# Export
GET    /api/kpi/records/:id/export    # Export to Excel
```

## Related Files

- `apps/api/src/app.module.ts` - Import KpiModule
- `apps/api/src/modules/kpi/*` - All new files

## Implementation Steps

- [ ] Create kpi.module.ts
- [ ] Create department.service.ts with list/create methods
- [ ] Create department.controller.ts
- [ ] Create DTOs for department
- [ ] Create kpi-record.service.ts with CRUD + calculation logic
- [ ] Create kpi-record.controller.ts
- [ ] Create DTOs for kpi-record
- [ ] Create kpi-metric.service.ts with CRUD methods
- [ ] Create kpi-export.service.ts with ExcelJS generation
- [ ] Create kpi-export.controller.ts
- [ ] Register KpiModule in app.module.ts
- [ ] Add Swagger documentation

## Key Implementation Details

### Calculation Logic

```typescript
// Efficiency calculation
calculateEfficiency(target: number, actual: number): number | null {
  if (target === 0 || target === null) return null; // #DIV/0!
  return (actual / target) * 100;
}

// Average calculation
calculateAverage(values: Record<string, number>): number {
  const validValues = Object.values(values).filter(v => v !== null && v !== undefined);
  if (validValues.length === 0) return 0;
  return validValues.reduce((a, b) => a + b, 0) / validValues.length;
}
```

### Excel Export

```typescript
// Using exceljs (already installed in frontend, need to add to API)
async exportToExcel(recordId: string): Promise<Buffer> {
  const record = await this.getRecordWithMetrics(recordId);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('KPI');
  // Add headers, data, formatting, chart
  return workbook.xlsx.writeBuffer();
}
```

## Success Criteria

- [ ] All endpoints return correct data
- [ ] Calculation logic works correctly
- [ ] Excel export generates valid file
- [ ] Authentication/authorization applied

## Todo List

- [ ] Create module structure
- [ ] Implement department endpoints
- [ ] Implement KPI record CRUD
- [ ] Implement metric CRUD
- [ ] Implement calculation logic
- [ ] Implement Excel export
- [ ] Add tests
