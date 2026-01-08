# Phase 1: Database Schema & Migration

**Phase:** 01  
**Duration:** 2-3 hours  
**Dependencies:** None

## Context

Junction table `user_departments` exists in DB but not in Prisma schema. Need to add UserDepartment model and migrate legacy data from `User.department` string field.

## Overview

Add UserDepartment model to schema, create data migration script to populate junction table from existing department strings, maintain backward compatibility.

## Requirements

### Schema Changes

1. Add UserDepartment model to `schema.prisma`
2. Add relations to User and Department models
3. Keep legacy `User.department` field temporarily
4. Add indexes for performance

### Data Migration

1. Create migration script to:
   - Read all users with non-null `department` field
   - Resolve department string to Department.id
   - Insert records into `user_departments` table
   - Handle duplicates gracefully

2. Rollback capability

## Architecture

```prisma
model User {
  // ... existing fields
  department String? // LEGACY - kept for backward compatibility

  // NEW: Many-to-many relation
  departments UserDepartment[]
}

model Department {
  // ... existing fields

  // NEW: Many-to-many relation
  users UserDepartment[]
}

model UserDepartment {
  userId       String      @map("user_id")
  departmentId String      @map("department_id")
  assignedAt   DateTime    @default(now()) @map("assigned_at")

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  department Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  @@id([userId, departmentId])
  @@index([userId])
  @@index([departmentId])
  @@map("user_departments")
}
```

## Implementation Steps

### 1. Update Prisma Schema

- [x] Add UserDepartment model
- [x] Add departments relation to User
- [x] Add users relation to Department
- [x] Add comment marking legacy field

**Files:** `apps/api/prisma/schema.prisma`

### 2. Generate Prisma Client

- [x] Run `npx prisma generate`
- [x] Verify types generated correctly

### 3. Create Data Migration Script

- [x] Create script at `apps/api/prisma/migrations/migrate-user-departments.ts`
- [x] Load all users with non-null department
- [x] For each user:
  - Resolve department string to ID using same logic as UserDepartmentResolver
  - Insert into user_departments if department found
  - Log warnings for unresolved departments
- [x] Add dry-run mode
- [x] Add rollback capability

**Files:** `apps/api/prisma/migrations/migrate-user-departments.ts`

### 4. Create Migration Executor

- [x] Create npm script to run migration
- [x] Add validation checks before migration
- [x] Add post-migration verification

**Files:** `apps/api/package.json`

### 5. Document Migration Process

- [x] Migration script includes built-in help and verification
- [x] Dry-run mode available for testing

**Files:** `apps/api/prisma/migrations/migrate-user-departments.ts`

## Todo List

```yaml
- id: schema-update
  content: Update schema.prisma with UserDepartment model
  status: pending

- id: generate-client
  content: Generate Prisma client with new model
  status: pending

- id: migration-script
  content: Create data migration script
  status: pending

- id: test-migration
  content: Test migration on development data
  status: pending

- id: document-process
  content: Document migration process
  status: pending
```

## Success Criteria

- [x] UserDepartment model in schema with proper relations ✅
- [x] Prisma client generates without errors ✅
- [x] Migration script successfully migrates test data ✅ (52/53 users)
- [x] Can query users with multiple departments ✅
- [x] Legacy department field still accessible ✅
- [x] All indexes created properly ✅

## Migration Results

- **Total users:** 53
- **Successfully migrated:** 52 users
- **Failed:** 1 user (boss - unresolved "Management" department)
- **UserDepartment records created:** 52
- **Verification:** ✅ Passed

## Testing Strategy

1. **Schema Validation**
   - Run `npx prisma validate`
   - Generate client successfully

2. **Migration Testing**
   - Create test users with various department formats
   - Run migration in dry-run mode
   - Verify data correctness
   - Test rollback

3. **Integration Testing**
   - Query users with departments relation
   - Verify junction table constraints

## Risk Assessment

| Risk                         | Likelihood | Impact | Mitigation                           |
| ---------------------------- | ---------- | ------ | ------------------------------------ |
| Invalid department strings   | Medium     | Low    | Log warnings, skip invalid entries   |
| Duplicate entries            | Low        | Low    | Use upsert, handle conflicts         |
| Migration fails mid-way      | Low        | High   | Transaction wrapper, rollback script |
| Performance on large dataset | Medium     | Medium | Batch processing, progress logging   |

## Rollback Plan

1. Delete all records from user_departments
2. Keep legacy department field intact
3. No schema changes needed initially

## Notes

- Migration should be idempotent
- Keep legacy field until Phase 4 complete
- Consider running migration off-peak hours in production
