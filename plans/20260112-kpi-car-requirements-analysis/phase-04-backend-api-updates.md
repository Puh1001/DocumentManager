# Phase 4: Backend API Updates

**Parent Plan:** [plan.md](./plan.md)  
**Dependencies:** 
- [Phase 2: Backend DTOs and Enums](./phase-02-backend-dtos-enums.md)
- [Phase 3: Backend Service Validation](./phase-03-backend-service-validation.md)  
**Status:** 🔲 Pending  
**Priority:** HIGH  
**Estimated Duration:** 2-3 hours

---

## Context Links

- [Analysis Document](./analysis.md) - API requirements
- [Phase 3](./phase-03-backend-service-validation.md) - Validation logic
- [KpiRecordController](../../apps/api/src/modules/kpi/controllers/kpi-record.controller.ts) - Current controller
- [KpiAttachmentController](../../apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts) - Attachment controller

---

## Overview

Update API controllers and Swagger documentation to expose new fields and validation. Ensure API responses include new fields and error messages are clear.

**Date:** 2026-01-12  
**Priority:** HIGH  
**Implementation Status:** 🔲 Pending  
**Review Status:** 🔲 Pending

---

## Key Insights

- Controllers already use DTOs (will automatically include new fields)
- Swagger documentation needs updates
- Error responses should include new error codes
- API responses should include new fields in KPI record objects

---

## Requirements

### Functional Requirements

1. **KPI Record Endpoints:**
   - GET `/kpi/records` - Include new fields in response
   - GET `/kpi/records/:id` - Include new fields in response
   - POST `/kpi/records` - Accept new fields in request body
   - PATCH `/kpi/records/:id` - Accept new fields in request body

2. **KPI Attachment Endpoints:**
   - POST `/kpi/records/:id/attachments` - Accept `attachmentType` in request
   - GET `/kpi/records/:id/attachments` - Include `attachmentType` in response
   - Filter attachments by type if needed

3. **Swagger Documentation:**
   - Document all new fields
   - Document conditional requirements
   - Document validation rules

### Non-Functional Requirements

- Backward compatible (existing API calls still work)
- Clear error messages
- Proper HTTP status codes

---

## Architecture

### API Response Structure

```typescript
// GET /kpi/records/:id response
{
  id: string;
  departmentId: string;
  year: number;
  title: string;
  // ... existing fields ...
  statisticalCycle: "MONTH" | "QUARTER" | "YEAR";
  status: "ACHIEVED" | "NOT_ACHIEVED";
  nonConformanceItem?: string;
  carStatus?: "OPEN" | "IN_PROGRESS" | "CLOSED";
  attachments: Array<{
    id: string;
    attachmentType: "KPI_EVIDENCE" | "CAR";
    // ... other fields ...
  }>;
}
```

### Error Response Structure

```typescript
// Validation error response
{
  statusCode: 400,
  message: "KPI Evidence PDF is mandatory when status is Achieved",
  error: "Bad Request",
  errorCode: "KPI_EVIDENCE_REQUIRED"
}
```

---

## Related Code Files

### Files to Modify

- `apps/api/src/modules/kpi/controllers/kpi-record.controller.ts`
  - Update Swagger documentation
  - Ensure responses include new fields

- `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts`
  - Update Swagger documentation for `attachmentType`
  - Update request/response types

### Files to Review

- `apps/api/src/modules/kpi/services/kpi-record.service.ts` - Response structure
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` - Response structure

---

## Implementation Steps

1. **Update KpiRecordController Swagger Docs**
   - Update `@ApiOperation` descriptions
   - Update `@ApiProperty` in DTOs (already done in Phase 2)
   - Add examples for new fields

2. **Update KpiAttachmentController**
   - Add `attachmentType` to `@ApiBody` schema
   - Update `@ApiOperation` description
   - Update response examples

3. **Verify Response Types**
   - Ensure Prisma includes new fields in responses
   - Test GET endpoints return new fields
   - Verify nullable fields handled correctly

4. **Update Error Handling**
   - Ensure new error codes return proper HTTP status
   - Update error response format if needed
   - Test error responses

5. **Test API Endpoints**
   - Test POST with new fields
   - Test PATCH with new fields
   - Test validation errors
   - Test Swagger UI displays correctly

---

## Todo List

- [ ] Update KpiRecordController Swagger docs
- [ ] Update KpiAttachmentController Swagger docs
- [ ] Add attachmentType to attachment endpoints
- [ ] Verify response types include new fields
- [ ] Test GET endpoints return new fields
- [ ] Test POST/PATCH with new fields
- [ ] Test validation error responses
- [ ] Verify Swagger UI displays correctly
- [ ] Update API documentation if separate file exists

---

## Success Criteria

- [ ] All endpoints accept new fields
- [ ] All endpoints return new fields
- [ ] Swagger documentation updated
- [ ] Error responses are clear
- [ ] Backward compatibility maintained
- [ ] API tests pass (if exist)

---

## Risk Assessment

### Potential Issues

1. **Breaking changes in API responses**
   - Mitigation: New fields are nullable/optional, backward compatible
   - Verification: Test with existing frontend code

2. **Swagger documentation incomplete**
   - Mitigation: Review all endpoints, add examples
   - Verification: Test Swagger UI

---

## Security Considerations

- No new security vulnerabilities
- Existing authentication/authorization remains
- Input validation via DTOs

---

## Next Steps

- **Dependency:** Phases 2 and 3 must be complete
- **Follow-up:** Phase 5 - Frontend Form Updates (consumes API)
- **Blockers:** None if dependencies complete
