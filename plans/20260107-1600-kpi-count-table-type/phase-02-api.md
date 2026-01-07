# Phase 2: Backend API

**Parent Plan:** [plan.md](./plan.md)  
**Dependencies:** Phase 1 (Schema)  
**Status:** 🔲 Pending  
**Priority:** High

---

## Overview

Update backend DTOs and services to handle displayType field.

## Changes

### DTOs

Update create/update DTOs to include displayType:

```typescript
// create-kpi-record.dto.ts
export class CreateKpiRecordDto {
  // ... existing fields ...
  @IsEnum(DisplayType)
  @IsOptional()
  displayType?: DisplayType;
}

// update-kpi-record.dto.ts
export class UpdateKpiRecordDto {
  // ... existing fields ...
  @IsEnum(DisplayType)
  @IsOptional()
  displayType?: DisplayType;
}
```

### Response DTOs

Ensure displayType is included in response:

```typescript
// kpi-record.entity.ts or response DTO
export class KpiRecordResponseDto {
  // ... existing fields ...
  displayType: DisplayType;
}
```

## Implementation Steps

- [ ] Add displayType to CreateKpiRecordDto
- [ ] Add displayType to UpdateKpiRecordDto
- [ ] Ensure displayType is returned in responses
- [ ] Update service methods if needed
- [ ] Test API endpoints with displayType

## Files to Modify

- `apps/api/src/modules/kpi/dto/create-kpi-record.dto.ts`
- `apps/api/src/modules/kpi/dto/update-kpi-record.dto.ts`
- `apps/api/src/modules/kpi/kpi.service.ts` (if needed)

## Success Criteria

- [ ] API accepts displayType in POST/PATCH requests
- [ ] API returns displayType in responses
- [ ] Default value is PERCENTAGE when not specified

