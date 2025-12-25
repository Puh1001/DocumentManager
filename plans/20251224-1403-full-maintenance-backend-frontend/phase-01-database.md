# Phase 1: Database Schema

**Parent Plan:** [plan.md](./plan.md)  
**Status:** ✅ Completed  
**Priority:** High

---

## Overview

Add MaintenanceNotice model to Prisma schema with proper relations and indexes.

## Requirements

1. MaintenanceNotice model with all required fields
2. Relation to Department (optional)
3. Relation to User (createdBy)
4. Proper indexes for query performance
5. Migration script

## Schema Design

```prisma
model MaintenanceNotice {
  id          String    @id @default(uuid())
  title       String
  description String?
  startDate   DateTime  @map("start_date")
  endDate     DateTime  @map("end_date")
  departmentId String?  @map("department_id")
  createdBy   String    @map("created_by")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  department Department? @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  creator     User         @relation(fields: [createdBy], references: [id])

  @@index([departmentId])
  @@index([startDate])
  @@index([createdBy])
  @@map("maintenance_notices")
}
```

## Related Files

- `apps/api/prisma/schema.prisma` - Add model
- `apps/api/src/common/prisma/prisma.service.ts` - Already exists

## Implementation Steps

- [x] Add MaintenanceNotice model to schema.prisma
- [x] Add relation to Department model
- [x] Add relation to User model
- [x] Generate Prisma client: `npx prisma generate`
- [x] Verify schema is correct

## Success Criteria

- Model added to schema
- Relations work correctly
- Migration runs without errors
- Indexes created for performance
