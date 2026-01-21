# Phase 3: Controller & DTO Updates

**Status:** Pending  
**Priority:** High  
**Date:** 2026-01-21  
**Dependencies:** Phase 1 (Schema), Phase 2 (Services)

## Overview

Add API endpoint for manual status updates. Update DTOs to include status field for read/write operations.

## Requirements

### Functional
- PATCH `/kpi/records/:id/status` - Update status manually
- Include status in record responses (findAll, findOne, create, update)
- DTOs support status field (create, update)
- Swagger documentation updated

### Non-Functional
- RESTful endpoint design
- Proper validation (IsEnum)
- Swagger annotations
- Follow existing patterns

## Architecture

### New Endpoint

```
PATCH /kpi/records/:id/status
Body: { "status": "COMPLETED" }
Response: Updated KpiRecord
```

### DTO Updates

- CreateKpiRecordDto: Optional status field
- UpdateKpiRecordDto: Inherits status field
- UpdateKpiStatusDto: New DTO for status-only updates

## Implementation Steps

### 1. Create UpdateKpiStatusDto

**File:** `apps/api/src/modules/kpi/dto/update-kpi-status.dto.ts` (NEW)

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { KpiStatus } from "@prisma/client";

export class UpdateKpiStatusDto {
  @ApiProperty({
    enum: KpiStatus,
    example: KpiStatus.COMPLETED,
    description: "KPI record status",
  })
  @IsEnum(KpiStatus)
  status: KpiStatus;
}
```

### 2. Update CreateKpiRecordDto

**File:** `apps/api/src/modules/kpi/dto/create-kpi-record.dto.ts`

Add status field (optional):

```typescript
import { KpiStatus } from "@prisma/client";

// Add after rowMode field (around line 62):

@ApiProperty({
  enum: KpiStatus,
  example: KpiStatus.PENDING,
  required: false,
  description: "Initial KPI status (defaults to PENDING if not provided)",
})
@IsEnum(KpiStatus)
@IsOptional()
status?: KpiStatus;
```

Update enum export:

```typescript
// Update imports at top
export { KpiStatus } from "@prisma/client";

// Remove local DisplayType/RowMode enums if using Prisma enums
// Or keep them for backward compatibility
```

### 3. Update KpiRecordController

**File:** `apps/api/src/modules/kpi/controllers/kpi-record.controller.ts`

#### Add Status Update Endpoint

Add after `remove()` method (around line 86):

```typescript
@Patch(":id/status")
@ApiOperation({ summary: "Update KPI record status" })
async updateStatus(
  @CurrentUserWithDepartment() user: UserWithDepartments,
  @Param("id") id: string,
  @Body() dto: UpdateKpiStatusDto
) {
  return this.kpiRecordService.updateStatus(id, dto.status, user);
}
```

#### Add Import

```typescript
import { UpdateKpiStatusDto } from "../dto/update-kpi-status.dto";
```

### 4. Update KpiRecordService (Minor)

**File:** `apps/api/src/modules/kpi/services/kpi-record.service.ts`

#### Update create() Method

Support optional status in create (around line 139):

```typescript
return this.prisma.kpiRecord.create({
  data: {
    departmentId: dto.departmentId,
    year: dto.year,
    title: dto.title,
    target: dto.target,
    targetValue: dto.targetValue,
    displayType: dto.displayType,
    rowMode: dto.rowMode,
    status: dto.status, // NEW
  },
});
```

#### Update update() Method

Support status in update (around line 196):

```typescript
return this.prisma.kpiRecord.update({
  where: { id },
  data: {
    departmentId: dto.departmentId,
    year: dto.year,
    title: dto.title,
    target: dto.target,
    targetValue: dto.targetValue,
    displayType: dto.displayType,
    rowMode: dto.rowMode,
    status: dto.status, // NEW
  },
});
```

## API Documentation

### Swagger Annotations

All endpoints automatically documented via:
- `@ApiOperation()` - Endpoint description
- `@ApiProperty()` - DTO field descriptions
- `@ApiTags()` - Grouping

### Example Requests

#### Update Status

```bash
PATCH /kpi/records/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "COMPLETED"
}
```

Response:

```json
{
  "id": "uuid",
  "departmentId": "uuid",
  "year": 2025,
  "title": "梭织转机效率 Hiệu quả chuyển máy dệt thoi",
  "target": "≥85%",
  "status": "COMPLETED",
  "createdAt": "2025-01-21T10:00:00Z",
  "updatedAt": "2025-01-21T10:05:00Z"
}
```

#### Create with Status

```bash
POST /kpi/records
Authorization: Bearer {token}
Content-Type: application/json

{
  "departmentId": "uuid",
  "year": 2025,
  "title": "梭织转机效率",
  "target": "≥85%",
  "status": "IN_PROGRESS"
}
```

## Related Code Files

### Files to Create
- `apps/api/src/modules/kpi/dto/update-kpi-status.dto.ts` - Status update DTO

### Files to Modify
- `apps/api/src/modules/kpi/dto/create-kpi-record.dto.ts` - Add status field
- `apps/api/src/modules/kpi/controllers/kpi-record.controller.ts` - Add endpoint
- `apps/api/src/modules/kpi/services/kpi-record.service.ts` - Support status in create/update

## Todo List

- [ ] Create UpdateKpiStatusDto
- [ ] Add status field to CreateKpiRecordDto
- [ ] Add updateStatus endpoint to KpiRecordController
- [ ] Update create() to support status
- [ ] Update update() to support status
- [ ] Test manual status update via API
- [ ] Verify Swagger documentation
- [ ] Test with Postman/curl
- [ ] Verify authorization (kpi_viewer_all blocked)
- [ ] Update API documentation if needed

## Success Criteria

- PATCH `/kpi/records/:id/status` endpoint works
- Status field included in all record responses
- CreateKpiRecordDto accepts optional status
- UpdateKpiRecordDto accepts optional status
- Swagger UI shows status field
- Authorization enforced correctly
- kpi_viewer_all role blocked from status updates
- Validation works (only valid enum values)

## Validation Rules

### UpdateKpiStatusDto
- status: Required, must be valid KpiStatus enum value

### CreateKpiRecordDto
- status: Optional, defaults to PENDING if not provided

### UpdateKpiRecordDto
- status: Optional, unchanged if not provided

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "status must be a valid enum value",
  "error": "Bad Request"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "kpi_viewer_all role is read-only. Cannot update KPI status.",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "KPI record not found",
  "error": "Not Found"
}
```

## Testing Checklist

- [ ] Create record with status
- [ ] Create record without status (defaults to PENDING)
- [ ] Update status via PATCH endpoint
- [ ] Update other fields (status unchanged)
- [ ] Update status with invalid value (400 error)
- [ ] Update as kpi_viewer_all role (403 error)
- [ ] Update non-existent record (404 error)
- [ ] Verify status in findAll response
- [ ] Verify status in findOne response

## Risk Assessment

**Low Risk:**
- Simple DTO additions
- New endpoint (no breaking changes)
- Optional field in existing DTOs
- Follows existing patterns

**Mitigation:**
- Test all existing endpoints
- Verify backward compatibility
- Check Swagger docs generated correctly

## Next Steps

After Phase 3 complete:
- Proceed to Phase 4: Edge Case Handling
- Document API changes
- Update Postman collection if exists
