# Phase 3: Backend Service Validation

**Parent Plan:** [plan.md](./plan.md)  
**Dependencies:** 
- [Phase 1: Database Schema Migration](./phase-01-database-schema-migration.md)
- [Phase 2: Backend DTOs and Enums](./phase-02-backend-dtos-enums.md)  
**Status:** 🔲 Pending  
**Priority:** HIGH  
**Estimated Duration:** 3-4 hours

---

## Context Links

- [Analysis Document](./analysis.md) - Validation requirements
- [Phase 2](./phase-02-backend-dtos-enums.md) - DTO definitions
- [KpiRecordService](../../apps/api/src/modules/kpi/services/kpi-record.service.ts) - Current service
- [KpiAttachmentService](../../apps/api/src/modules/kpi/services/kpi-attachment.service.ts) - Attachment service

---

## Overview

Implement validation logic in backend services to enforce mandatory PDF uploads and conditional field requirements based on KPI Status. Validation should occur when creating/updating KPI records.

**Date:** 2026-01-12  
**Priority:** HIGH  
**Implementation Status:** 🔲 Pending  
**Review Status:** 🔲 Pending

---

## Key Insights

- Validation timing: When status changes to ACHIEVED or NOT_ACHIEVED
- KPI Evidence PDF: Always mandatory (regardless of status)
- CAR PDF: Mandatory only if status = NOT_ACHIEVED
- Need to check attachments by type (KPI_EVIDENCE vs CAR)
- Validation should be in service layer, not just DTOs

---

## Requirements

### Functional Requirements

1. **KPI Record Creation/Update Validation:**
   - If `status = ACHIEVED`: Require at least one KPI_EVIDENCE attachment
   - If `status = NOT_ACHIEVED`: Require:
     - `nonConformanceItem` (already in DTO validation)
     - `carStatus` (already in DTO validation)
     - At least one CAR attachment

2. **Attachment Type Validation:**
   - Ensure attachmentType is set correctly when uploading
   - Default to KPI_EVIDENCE if not specified

3. **Status Change Validation:**
   - When updating status, validate requirements for new status
   - Allow status change only if requirements are met

### Non-Functional Requirements

- Validation errors should be clear and actionable
- Use existing CustomException pattern
- Log validation failures for debugging
- Performance: Minimize database queries

---

## Architecture

### Validation Flow

```
Create/Update KPI Record
  ↓
DTO Validation (Phase 2)
  ↓
Service Validation (This Phase)
  ├─ Check status
  ├─ If ACHIEVED: Check KPI_EVIDENCE attachments
  └─ If NOT_ACHIEVED: Check CAR attachments + fields
  ↓
Save to Database
```

### Validation Methods

```typescript
// In KpiRecordService
private async validateKpiRecordRequirements(
  recordId: string,
  status: KpiStatus
): Promise<void> {
  if (status === KpiStatus.ACHIEVED) {
    const hasEvidence = await this.hasAttachmentType(
      recordId,
      AttachmentType.KPI_EVIDENCE
    );
    if (!hasEvidence) {
      throw CustomException.badRequest(
        ErrorCodes.KPI.EVIDENCE_REQUIRED,
        "KPI Evidence PDF is mandatory when status is Achieved"
      );
    }
  } else if (status === KpiStatus.NOT_ACHIEVED) {
    const hasCarPdf = await this.hasAttachmentType(
      recordId,
      AttachmentType.CAR
    );
    if (!hasCarPdf) {
      throw CustomException.badRequest(
        ErrorCodes.KPI.CAR_PDF_REQUIRED,
        "CAR PDF is mandatory when status is Not achieved"
      );
    }
  }
}

private async hasAttachmentType(
  recordId: string,
  attachmentType: AttachmentType
): Promise<boolean> {
  const count = await this.prisma.kpiAttachment.count({
    where: {
      kpiRecordId: recordId,
      attachmentType,
    },
  });
  return count > 0;
}
```

---

## Related Code Files

### Files to Modify

- `apps/api/src/modules/kpi/services/kpi-record.service.ts`
  - Add validation methods
  - Update `create()` method
  - Update `update()` method

- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`
  - Ensure `attachmentType` is set (default to KPI_EVIDENCE)
  - Update `uploadAttachment()` method

- `apps/api/src/common/errors/error-codes.ts`
  - Add new error codes if needed

### Files to Review

- `apps/api/src/modules/kpi/controllers/kpi-record.controller.ts` - May need error handling updates

---

## Implementation Steps

1. **Add Error Codes (if needed)**
   - Add `EVIDENCE_REQUIRED` to ErrorCodes.KPI
   - Add `CAR_PDF_REQUIRED` to ErrorCodes.KPI

2. **Update KpiRecordService**
   - Import enums from DTOs
   - Add `validateKpiRecordRequirements()` private method
   - Add `hasAttachmentType()` private helper method
   - Update `create()` method to call validation
   - Update `update()` method to call validation (only if status changes)

3. **Update KpiAttachmentService**
   - Import `AttachmentType` enum
   - Update `uploadAttachment()` to accept `attachmentType` parameter
   - Default to `KPI_EVIDENCE` if not provided
   - Store `attachmentType` in database

4. **Update KpiAttachmentController**
   - Update `uploadAttachment()` to accept `attachmentType` in body
   - Pass `attachmentType` to service

5. **Add Validation Logging**
   - Log validation failures for debugging
   - Use existing Logger pattern

6. **Test Validation Logic**
   - Test ACHIEVED status without evidence PDF (should fail)
   - Test NOT_ACHIEVED status without CAR PDF (should fail)
   - Test valid scenarios (should succeed)

---

## Todo List

- [ ] Add error codes for validation failures
- [ ] Add validateKpiRecordRequirements() method
- [ ] Add hasAttachmentType() helper method
- [ ] Update create() method with validation
- [ ] Update update() method with validation
- [ ] Update uploadAttachment() to handle attachmentType
- [ ] Update controller to accept attachmentType
- [ ] Add validation logging
- [ ] Test validation scenarios
- [ ] Update error messages for i18n if needed

---

## Success Criteria

- [ ] Validation enforces KPI Evidence PDF for ACHIEVED status
- [ ] Validation enforces CAR PDF for NOT_ACHIEVED status
- [ ] Validation errors are clear and actionable
- [ ] attachmentType defaults to KPI_EVIDENCE
- [ ] Validation works on both create and update
- [ ] Logging added for debugging
- [ ] No performance degradation

---

## Risk Assessment

### Potential Issues

1. **Validation too strict (blocks legitimate use cases)**
   - Mitigation: Allow status change without immediate validation, validate on final submission
   - Consider: Validate on status change vs on save

2. **Performance impact from attachment queries**
   - Mitigation: Use count() instead of findMany()
   - Cache attachment counts if needed

3. **Race condition: Attachment uploaded after validation**
   - Mitigation: Validation happens before save, attachments checked after save
   - Consider: Validate attachments exist before allowing status change

---

## Security Considerations

- Validation prevents invalid data entry
- No new security vulnerabilities
- Existing permission checks remain valid

---

## Next Steps

- **Dependency:** Phases 1 and 2 must be complete
- **Follow-up:** Phase 4 - Backend API Updates (exposes validation)
- **Blockers:** None if dependencies complete
