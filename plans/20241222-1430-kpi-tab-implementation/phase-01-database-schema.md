# Phase 1: Database Schema

**Parent Plan:** [plan.md](./plan.md)  
**Status:** 🔲 Pending  
**Priority:** High

---

## Overview

Create database models for KPI feature: Department, KpiRecord, KpiMetric.

## Requirements

1. Store department information separately (currently string field in User)
2. Store KPI records with title, target, year per department
3. Store metric rows with monthly values (JSON for flexibility)
4. Support calculated fields (efficiency, average)

## Architecture

### Entity Relationship

```
Department 1:N KpiRecord 1:N KpiMetric
```

### Prisma Schema Additions

```prisma
// Add to schema.prisma

model Department {
  id        String      @id @default(uuid())
  name      String      // e.g., "转机部 chuyển máy dệt dây đai-V-TECH"
  code      String      @unique // e.g., "DEPT-001"
  isActive  Boolean     @default(true)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  kpiRecords KpiRecord[]

  @@index([code])
  @@map("departments")
}

model KpiRecord {
  id           String    @id @default(uuid())
  departmentId String    @map("department_id")
  year         Int       // e.g., 2024
  title        String    // e.g., "梭织转机效率 Hiệu quả chuyển máy dệt thoi"
  target       String    // e.g., "≥85%"
  targetValue  Float?    @map("target_value") // numeric: 85
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  createdBy    String?   @map("created_by")

  department Department   @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  metrics    KpiMetric[]

  @@unique([departmentId, year, title])
  @@index([departmentId])
  @@index([year])
  @@map("kpi_records")
}

enum MetricType {
  TARGET    // 理论转机数量 - theoretical/target values
  ACTUAL    // 转机实际 - actual values
  CALCULATED // 梭织转机效率 - auto-calculated
}

model KpiMetric {
  id          String     @id @default(uuid())
  kpiRecordId String     @map("kpi_record_id")
  name        String     // e.g., "理论转机数量 (台) Số máy cần chuyển (máy)"
  type        MetricType @default(TARGET)
  sortOrder   Int        @map("sort_order")
  // Monthly values stored as JSON: {"m1": 599, "m2": 495, ...}
  values      Json       @default("{}")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  kpiRecord KpiRecord @relation(fields: [kpiRecordId], references: [id], onDelete: Cascade)

  @@index([kpiRecordId])
  @@map("kpi_metrics")
}
```

## Related Files

- `apps/api/prisma/schema.prisma` - Add new models
- `apps/api/prisma/seed.ts` - Add seed data for departments

## Implementation Steps

- [ ] Add Department model to schema.prisma
- [ ] Add KpiRecord model to schema.prisma
- [ ] Add KpiMetric model to schema.prisma
- [ ] Add MetricType enum
- [ ] Run `npx prisma migrate dev --name add_kpi_models`
- [ ] Add seed data for sample departments
- [ ] Run `npx prisma db seed`

## Success Criteria

- [ ] Migration runs without errors
- [ ] Models are accessible via Prisma Client
- [ ] Seed data creates sample departments

## Risk Assessment

- **Risk**: JSON field may have performance issues with large datasets
- **Mitigation**: Index on kpiRecordId ensures fast lookups; JSON is suitable for 12 monthly values
