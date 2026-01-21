# Phase 2: Service Layer Updates

**Status:** Pending  
**Priority:** High  
**Date:** 2026-01-21  
**Dependencies:** Phase 1 (Database Schema)

## Overview

Update service layer to handle status updates. Two components:
1. KpiRecordService: Add manual status update method
2. KpiAttachmentService: Auto-update status on upload/delete

## Requirements

### Functional
- Manual status update via KpiRecordService.updateStatus()
- Auto-update to COMPLETED on attachment upload
- Revert to PENDING when last attachment deleted (optional)
- Validate status transitions
- Respect authorization (kpi_viewer_all = read-only)

### Non-Functional
- Minimal changes to existing code
- Follow existing patterns (checkDepartmentAccess)
- Audit logging for status changes
- No breaking changes

## Architecture

### Status Transition Rules

```
PENDING → IN_PROGRESS (manual only)
PENDING → COMPLETED (upload or manual)
IN_PROGRESS → COMPLETED (upload or manual)
COMPLETED → PENDING (delete last attachment, optional)
COMPLETED → IN_PROGRESS (manual only)
IN_PROGRESS → PENDING (manual only)
```

### Auto-Update Triggers

1. **Upload Attachment** → Set COMPLETED
   - Triggered in: `KpiAttachmentService.uploadAttachment()`
   - After: `kpiAttachment.create()`

2. **Delete Attachment** → Check remaining attachments
   - Triggered in: `KpiAttachmentService.deleteAttachment()`
   - After: `kpiAttachment.delete()`
   - If 0 attachments remaining → Set PENDING

## Implementation Steps

### 1. Update KpiRecordService

**File:** `apps/api/src/modules/kpi/services/kpi-record.service.ts`

#### Add updateStatus Method

Add after `remove()` method (around line 241):

```typescript
/**
 * Update KPI record status manually.
 * Validates department access and user permissions.
 */
async updateStatus(
  id: string,
  status: KpiStatus,
  user: UserWithDepartments
): Promise<KpiRecord> {
  // Check existing record
  const existing = await this.prisma.kpiRecord.findUnique({
    where: { id },
    select: { 
      id: true, 
      departmentId: true, 
      status: true 
    },
  });

  if (!existing) {
    throw CustomException.notFound(
      ErrorCodes.KPI.RECORD_NOT_FOUND,
      "KPI record not found"
    );
  }

  // Check department access
  this.checkDepartmentAccess(existing.departmentId, user);

  // kpi_viewer_all role is read-only
  if (user.isKpiViewerAll) {
    this.logger.warn(
      `Authorization denied: User ${user.userId} with kpi_viewer_all role attempted to update KPI status`,
      { userId: user.userId, recordId: id }
    );
    throw CustomException.forbidden(
      ErrorCodes.KPI.ACCESS_DENIED,
      "kpi_viewer_all role is read-only. Cannot update KPI status."
    );
  }

  // Update status
  const updated = await this.prisma.kpiRecord.update({
    where: { id },
    data: { status },
    include: {
      department: true,
      metrics: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  // Audit log
  await this.prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "UPDATE",
      resourceType: "KpiRecord",
      resourceId: id,
      details: {
        field: "status",
        oldValue: existing.status,
        newValue: status,
      },
    },
  });

  this.logger.log(
    `KPI record ${id} status updated: ${existing.status} → ${status} by user ${user.userId}`
  );

  return updated;
}
```

#### Add Import for KpiStatus

Add to imports at top:

```typescript
import { KpiStatus } from "@prisma/client";
```

### 2. Update KpiAttachmentService

**File:** `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`

#### Modify uploadAttachment Method

Update the method to auto-update status after creating attachment.

Find the section after `await this.prisma.auditLog.create()` (around line 121), add:

```typescript
    // Auto-update KPI record status to COMPLETED
    await this.prisma.kpiRecord.update({
      where: { id: record.id },
      data: { status: 'COMPLETED' },
    });

    this.logger.log(
      `Auto-updated KPI record ${record.id} status to COMPLETED after attachment upload`
    );

    return attachment;
  }
```

#### Modify deleteAttachment Method

Update the method to check remaining attachments and revert status if needed.

After `await this.prisma.kpiAttachment.delete()` (around line 276), add:

```typescript
    // Check remaining attachments for this KPI record
    const remainingCount = await (
      this.prisma as PrismaClientLike
    ).kpiAttachment.count({
      where: { kpiRecordId: attachment.kpiRecordId },
    });

    // If no attachments remain and status is COMPLETED, revert to PENDING
    if (remainingCount === 0) {
      const kpiRecord = await (
        this.prisma as PrismaClientLike
      ).kpiRecord.findUnique({
        where: { id: attachment.kpiRecordId },
        select: { status: true },
      });

      if (kpiRecord?.status === 'COMPLETED') {
        await (this.prisma as PrismaClientLike).kpiRecord.update({
          where: { id: attachment.kpiRecordId },
          data: { status: 'PENDING' },
        });

        this.logger.log(
          `Auto-reverted KPI record ${attachment.kpiRecordId} status to PENDING after deleting last attachment`
        );
      }
    }

    // Log the deletion (existing code continues...)
```

## Related Code Files

### Files to Modify
- `apps/api/src/modules/kpi/services/kpi-record.service.ts` - Add updateStatus()
- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts` - Auto-update status

### No Files Created

## Code Snippets

### Import KpiStatus in KpiRecordService

```typescript
import { KpiStatus } from "@prisma/client";
```

### Alternative: Status Transition Validation

Optional - Add validation for status transitions:

```typescript
/**
 * Validate if status transition is allowed
 */
private validateStatusTransition(
  currentStatus: KpiStatus,
  newStatus: KpiStatus
): void {
  const allowedTransitions: Record<KpiStatus, KpiStatus[]> = {
    PENDING: ['IN_PROGRESS', 'COMPLETED'],
    IN_PROGRESS: ['COMPLETED', 'PENDING'],
    COMPLETED: ['IN_PROGRESS', 'PENDING'],
  };

  if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
    throw CustomException.badRequest(
      ErrorCodes.INVALID_INPUT,
      `Invalid status transition: ${currentStatus} → ${newStatus}`
    );
  }
}
```

Use in updateStatus():

```typescript
// Validate transition
this.validateStatusTransition(existing.status, status);
```

## Todo List

- [ ] Add KpiStatus import to KpiRecordService
- [ ] Add updateStatus() method to KpiRecordService
- [ ] Modify uploadAttachment() to auto-update status
- [ ] Modify deleteAttachment() to check and revert status
- [ ] Add audit logging for status changes
- [ ] (Optional) Add status transition validation
- [ ] Test status updates manually
- [ ] Verify auto-update on upload
- [ ] Verify revert on delete last attachment

## Success Criteria

- updateStatus() method works correctly
- Status auto-updates to COMPLETED on attachment upload
- Status reverts to PENDING when last attachment deleted
- Department access checks enforced
- kpi_viewer_all role blocked from updates
- Audit logs created for status changes
- No regression in existing functionality
- All existing tests pass

## Risk Assessment

**Medium Risk:**
- Modifying existing methods (uploadAttachment, deleteAttachment)
- Potential race conditions (multiple uploads/deletes)

**Mitigation:**
- Test thoroughly with multiple attachments
- Use database transactions if needed
- Monitor logs for unexpected behavior
- Add integration tests

## Security Considerations

- Status updates follow existing authorization pattern
- kpi_viewer_all role blocked (read-only)
- Department access validated
- Audit logs created for all changes
- No bypass for status restrictions

## Performance Considerations

- Status update is single UPDATE query (fast)
- Attachment count query minimal overhead
- No N+1 queries
- Index on status field (added in Phase 1)

## Edge Cases to Handle

1. **Multiple simultaneous uploads** → All update to COMPLETED (idempotent)
2. **Delete non-last attachment** → Status unchanged
3. **Manual override after auto-update** → Allowed
4. **Status COMPLETED, no attachments** → Allowed (manual completion)

## Next Steps

After Phase 2 complete:
- Proceed to Phase 3: Controller & DTO Updates
- Add API endpoint for manual status update
- Update DTOs to include status field
