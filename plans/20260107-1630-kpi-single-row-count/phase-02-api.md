# Phase 2: Backend API

**Status:** 🔲 Pending

---

## Changes

Update DTOs:

```typescript
export enum RowMode {
  SINGLE = "SINGLE",
  DOUBLE = "DOUBLE",
}

export class CreateKpiRecordDto {
  // ... existing fields ...
  
  @ApiProperty({ enum: RowMode, required: false })
  @IsEnum(RowMode)
  @IsOptional()
  rowMode?: RowMode;
}
```

## Implementation

- [ ] Add RowMode enum to DTO
- [ ] Update CreateKpiRecordDto
- [ ] Update UpdateKpiRecordDto (auto via PartialType)
- [ ] Update service create/update methods

