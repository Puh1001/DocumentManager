# Phase 1: Database Schema Migration

**Parent Plan:** [plan.md](./plan.md)  
**Status:** 🔲 Pending  
**Priority:** HIGH  
**Estimated Duration:** 1-2 hours

---

## Context Links

- [Analysis Document](./analysis.md) - Detailed requirements analysis
- [Prisma Schema](../../apps/api/prisma/schema.prisma) - Current database schema
- [Code Standards](../../docs/code-standards.md) - Coding conventions

---

## Overview

Add new enums and fields to Prisma schema for KPI/CAR requirements. This phase is non-breaking - all new fields are nullable with defaults to support backward compatibility.

**Date:** 2026-01-12  
**Priority:** HIGH  
**Implementation Status:** 🔲 Pending  
**Review Status:** 🔲 Pending

---

## Key Insights

- Existing `KpiRecord` model needs 4 new fields
- Existing `KpiAttachment` model needs 1 new field
- Need 4 new enums: `StatisticalCycle`, `KpiStatus`, `CarStatus`, `AttachmentType`
- All new fields should be nullable initially for backward compatibility
- Migration should set default values for existing records

---

## Requirements

### Functional Requirements

1. Add `StatisticalCycle` enum (MONTH, QUARTER, YEAR)
2. Add `KpiStatus` enum (ACHIEVED, NOT_ACHIEVED)
3. Add `CarStatus` enum (OPEN, IN_PROGRESS, CLOSED)
4. Add `AttachmentType` enum (KPI_EVIDENCE, CAR)
5. Add fields to `KpiRecord`:
   - `statisticalCycle` (StatisticalCycle, default: MONTH)
   - `status` (KpiStatus, nullable initially)
   - `nonConformanceItem` (String?, nullable)
   - `carStatus` (CarStatus?, nullable)
6. Add field to `KpiAttachment`:
   - `attachmentType` (AttachmentType, default: KPI_EVIDENCE)

### Non-Functional Requirements

- Backward compatible (existing records work without new fields)
- Migration should be reversible
- Default values for existing records
- Indexes if needed for performance

---

## Architecture

### Schema Changes

```prisma
// New Enums
enum StatisticalCycle {
  MONTH   // 月度
  QUARTER // 季度
  YEAR    // 年度
}

enum KpiStatus {
  ACHIEVED     // 达标
  NOT_ACHIEVED // 不达标
}

enum CarStatus {
  OPEN         // 开启
  IN_PROGRESS  // 进行中
  CLOSED       // 关闭
}

enum AttachmentType {
  KPI_EVIDENCE // KPI证据PDF
  CAR          // CAR PDF
}

// KpiRecord Model Updates
model KpiRecord {
  // ... existing fields ...
  
  statisticalCycle    StatisticalCycle @default(MONTH) @map("statistical_cycle")
  status              KpiStatus?       @map("status") // Nullable initially
  nonConformanceItem  String?          @map("non_conformance_item")
  carStatus           CarStatus?       @map("car_status")
  
  // ... rest of model ...
}

// KpiAttachment Model Updates
model KpiAttachment {
  // ... existing fields ...
  
  attachmentType      AttachmentType @default(KPI_EVIDENCE) @map("attachment_type")
  
  // ... rest of model ...
}
```

### Migration Strategy

1. Create Prisma migration with new enums and fields
2. Set defaults for existing records:
   - `statisticalCycle = MONTH` (all existing records)
   - `status = null` (will be set manually or via Phase 2 logic)
   - `attachmentType = KPI_EVIDENCE` (all existing attachments)
3. Run migration in development
4. Test migration rollback

---

## Related Code Files

### Files to Modify

- `apps/api/prisma/schema.prisma` - Add enums and fields

### Files to Create

- `apps/api/prisma/migrations/YYYYMMDDHHMMSS_add_kpi_car_fields/migration.sql` - Migration file (auto-generated)

### Files to Review

- `apps/api/src/modules/kpi/services/kpi-record.service.ts` - Will use new fields in Phase 3
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` - Will use attachmentType in Phase 3

---

## Implementation Steps

1. **Update Prisma Schema**
   - Add 4 new enums to schema.prisma
   - Add `statisticalCycle` field to `KpiRecord` with default MONTH
   - Add `status` field to `KpiRecord` (nullable)
   - Add `nonConformanceItem` field to `KpiRecord` (nullable)
   - Add `carStatus` field to `KpiRecord` (nullable)
   - Add `attachmentType` field to `KpiAttachment` with default KPI_EVIDENCE

2. **Generate Migration**
   - Run `npx prisma migrate dev --name add_kpi_car_fields` in `apps/api`
   - Review generated migration SQL
   - Verify defaults are set correctly

3. **Update Existing Records (Migration Script)**
   - Create migration script to set defaults:
     ```sql
     -- Set default statisticalCycle for existing records
     UPDATE kpi_records SET statistical_cycle = 'MONTH' WHERE statistical_cycle IS NULL;
     
     -- Set default attachmentType for existing attachments
     UPDATE kpi_attachments SET attachment_type = 'KPI_EVIDENCE' WHERE attachment_type IS NULL;
     ```

4. **Regenerate Prisma Client**
   - Run `npx prisma generate` in `apps/api`
   - Verify TypeScript types are updated

5. **Test Migration**
   - Test migration forward (apply)
   - Test migration backward (rollback)
   - Verify existing records still accessible
   - Verify new fields have correct defaults

---

## Todo List

- [ ] Add enums to schema.prisma
- [ ] Add fields to KpiRecord model
- [ ] Add field to KpiAttachment model
- [ ] Generate Prisma migration
- [ ] Review migration SQL
- [ ] Create data migration script for defaults
- [ ] Run migration in development
- [ ] Regenerate Prisma client
- [ ] Test migration forward/backward
- [ ] Verify existing records work
- [ ] Update TypeScript types if needed

---

## Success Criteria

- [ ] All 4 enums added to schema
- [ ] All 5 fields added to models
- [ ] Migration generated successfully
- [ ] Existing records have default values
- [ ] Prisma client regenerated
- [ ] No TypeScript errors
- [ ] Migration is reversible
- [ ] Existing functionality still works

---

## Risk Assessment

### Potential Issues

1. **Migration fails on production data**
   - Mitigation: Test migration on production-like data first
   - Rollback plan: Migration is reversible

2. **Default values not set correctly**
   - Mitigation: Explicit SQL in migration to set defaults
   - Verification: Query existing records after migration

3. **TypeScript types not updated**
   - Mitigation: Regenerate Prisma client after migration
   - Verification: Check for TypeScript errors

### Mitigation Strategies

- Test migration on development database first
- Backup production database before migration
- Use transaction for migration (Prisma default)
- Verify defaults with SQL queries after migration

---

## Security Considerations

- No security impact - schema changes only
- No new authentication/authorization needed
- Existing permission checks remain valid

---

## Next Steps

- **Dependency:** None (this is the first phase)
- **Follow-up:** Phase 2 - Backend DTOs and Enums (requires this phase complete)
- **Blockers:** None
