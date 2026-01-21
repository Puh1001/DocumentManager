# Phase 2: Backend DTOs and Enums

**Parent Plan:** [plan.md](./plan.md)  
**Dependencies:** [Phase 1: Database Schema Migration](./phase-01-database-schema-migration.md)  
**Status:** 🔲 Pending  
**Priority:** HIGH  
**Estimated Duration:** 2-3 hours

---

## Context Links

- [Analysis Document](./analysis.md) - Requirements specification
- [Phase 1](./phase-01-database-schema-migration.md) - Database schema changes
- [Code Standards](../../docs/code-standards.md) - DTO patterns
- [CreateKpiRecordDto](../../apps/api/src/modules/kpi/dto/create-kpi-record.dto.ts) - Current DTO

---

## Overview

Create TypeScript enums and update DTOs to support new KPI/CAR fields. Enums should match Prisma schema enums. DTOs need conditional validation based on KPI Status.

**Date:** 2026-01-12  
**Priority:** HIGH  
**Implementation Status:** 🔲 Pending  
**Review Status:** 🔲 Pending

---

## Key Insights

- Enums must match Prisma schema exactly
- Conditional validation using `@ValidateIf` decorator
- `status` field is mandatory in CreateKpiRecordDto
- `nonConformanceItem` and `carStatus` are mandatory only if `status = NOT_ACHIEVED`
- `attachmentType` is optional in CreateKpiAttachmentDto (defaults to KPI_EVIDENCE)

---

## Requirements

### Functional Requirements

1. Create TypeScript enums matching Prisma enums:
   - `StatisticalCycle` enum
   - `KpiStatus` enum
   - `CarStatus` enum
   - `AttachmentType` enum

2. Update `CreateKpiRecordDto`:
   - Add `statisticalCycle` (mandatory, default: MONTH)
   - Add `status` (mandatory)
   - Add `nonConformanceItem` (conditional: mandatory if status = NOT_ACHIEVED)
   - Add `carStatus` (conditional: mandatory if status = NOT_ACHIEVED)

3. Update `UpdateKpiRecordDto`:
   - Same fields as CreateKpiRecordDto but all optional

4. Update `CreateKpiAttachmentDto`:
   - Add `attachmentType` (optional, default: KPI_EVIDENCE)

### Non-Functional Requirements

- Enums exported for use in services
- Validation decorators from class-validator
- Swagger documentation with @ApiProperty
- Type safety with TypeScript

---

## Architecture

### Enum Definitions

```typescript
// apps/api/src/modules/kpi/dto/enums.ts (new file)
export enum StatisticalCycle {
  MONTH = "MONTH",
  QUARTER = "QUARTER",
  YEAR = "YEAR",
}

export enum KpiStatus {
  ACHIEVED = "ACHIEVED",
  NOT_ACHIEVED = "NOT_ACHIEVED",
}

export enum CarStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  CLOSED = "CLOSED",
}

export enum AttachmentType {
  KPI_EVIDENCE = "KPI_EVIDENCE",
  CAR = "CAR",
}
```

### DTO Updates

```typescript
// CreateKpiRecordDto additions
@ApiProperty({ enum: StatisticalCycle, default: StatisticalCycle.MONTH })
@IsEnum(StatisticalCycle)
@IsNotEmpty()
statisticalCycle: StatisticalCycle;

@ApiProperty({ enum: KpiStatus })
@IsEnum(KpiStatus)
@IsNotEmpty()
status: KpiStatus;

@ApiProperty({ required: false })
@ValidateIf((o) => o.status === KpiStatus.NOT_ACHIEVED)
@IsString()
@IsNotEmpty()
nonConformanceItem?: string;

@ApiProperty({ enum: CarStatus, required: false })
@ValidateIf((o) => o.status === KpiStatus.NOT_ACHIEVED)
@IsEnum(CarStatus)
@IsNotEmpty()
carStatus?: CarStatus;
```

---

## Related Code Files

### Files to Create

- `apps/api/src/modules/kpi/dto/enums.ts` - Enum definitions

### Files to Modify

- `apps/api/src/modules/kpi/dto/create-kpi-record.dto.ts` - Add new fields
- `apps/api/src/modules/kpi/dto/update-kpi-record.dto.ts` - Add new fields (optional)
- `apps/api/src/modules/kpi/dto/create-kpi-attachment.dto.ts` - Add attachmentType

### Files to Review

- `apps/api/src/modules/kpi/services/kpi-record.service.ts` - Will use enums
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` - Will use AttachmentType

---

## Implementation Steps

1. **Create Enums File**
   - Create `apps/api/src/modules/kpi/dto/enums.ts`
   - Define all 4 enums matching Prisma schema
   - Export enums

2. **Update CreateKpiRecordDto**
   - Import enums
   - Add `statisticalCycle` field with validation
   - Add `status` field with validation
   - Add `nonConformanceItem` with conditional validation
   - Add `carStatus` with conditional validation
   - Update Swagger documentation

3. **Update UpdateKpiRecordDto**
   - Import enums
   - Add same fields as CreateKpiRecordDto but all optional
   - Use `@IsOptional()` for all new fields
   - Keep conditional validation for `nonConformanceItem` and `carStatus`

4. **Update CreateKpiAttachmentDto**
   - Import `AttachmentType` enum
   - Add `attachmentType` field (optional, default: KPI_EVIDENCE)
   - Update Swagger documentation

5. **Export Enums from Module**
   - Export enums from `dto/index.ts` if exists, or from individual files
   - Ensure enums are accessible to services

6. **Verify TypeScript Compilation**
   - Run `npm run build` in `apps/api`
   - Fix any TypeScript errors
   - Verify enum values match Prisma schema

---

## Todo List

- [ ] Create enums.ts file with 4 enums
- [ ] Update CreateKpiRecordDto with new fields
- [ ] Add conditional validation for nonConformanceItem
- [ ] Add conditional validation for carStatus
- [ ] Update UpdateKpiRecordDto with optional fields
- [ ] Update CreateKpiAttachmentDto with attachmentType
- [ ] Update Swagger documentation
- [ ] Export enums for use in services
- [ ] Verify TypeScript compilation
- [ ] Test DTO validation manually

---

## Success Criteria

- [ ] All 4 enums created and match Prisma schema
- [ ] CreateKpiRecordDto has all new fields with validation
- [ ] Conditional validation works correctly
- [ ] UpdateKpiRecordDto has optional fields
- [ ] CreateKpiAttachmentDto has attachmentType field
- [ ] Swagger documentation updated
- [ ] TypeScript compiles without errors
- [ ] Enums exported and accessible

---

## Risk Assessment

### Potential Issues

1. **Enum values don't match Prisma schema**
   - Mitigation: Copy enum values exactly from Prisma schema
   - Verification: Compare enum values side-by-side

2. **Conditional validation not working**
   - Mitigation: Test with different status values
   - Verification: Unit tests for DTO validation

3. **TypeScript compilation errors**
   - Mitigation: Fix immediately, don't proceed with errors
   - Verification: Run build command

---

## Security Considerations

- No security impact - DTOs are validation only
- Conditional validation ensures data integrity
- Enum validation prevents invalid values

---

## Next Steps

- **Dependency:** Phase 1 must be complete (enums in Prisma schema)
- **Follow-up:** Phase 3 - Backend Service Validation (uses these DTOs)
- **Blockers:** None if Phase 1 complete
