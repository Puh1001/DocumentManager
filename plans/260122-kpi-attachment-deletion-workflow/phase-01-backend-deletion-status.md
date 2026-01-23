# Phase 1: Backend - Deletion Status & Rules

**Date:** 2026-01-22  
**Priority:** High  
**Status:** ✅ Completed

---

## Goal

Add deletion status checking and 72-hour rule enforcement to KPI attachment deletion.

---

## Requirements

1. **Deletion Status Endpoint**
   - `GET /kpi/attachments/:id/deletion-status`
   - Returns: `canDelete`, `isExpired`, `remainingHours`, `requiresDCCApproval`, `hasActiveRequest`

2. **Update Delete Endpoint**
   - Use `DocumentDeletionService.checkDeletionStatus()` before deletion
   - If expired, throw error with message to submit deletion request
   - If within 72h, use `DocumentDeletionService.selfDelete()`

3. **Deletion Request Support**
   - Allow submitting deletion requests for KPI attachments
   - Use existing `DocumentDeletionService.submitDeletionRequest()`

---

## Implementation

### Step 1: Inject DocumentDeletionService

**File:** `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`

```typescript
constructor(
  // ... existing dependencies
  private readonly deletionService: DocumentDeletionService,
) {}
```

### Step 2: Add Deletion Status Method

```typescript
async getDeletionStatus(
  attachmentId: string,
  userId: string,
): Promise<DeletionStatus> {
  const attachment = await this.getAttachmentById(attachmentId, userId);
  return this.deletionService.checkDeletionStatus(
    attachment.documentId,
    userId,
  );
}
```

### Step 3: Update Delete Method

```typescript
async deleteAttachment(
  attachmentId: string,
  user: UserWithDepartments,
): Promise<{ success: boolean }> {
  const attachment = await this.getAttachmentById(attachmentId, user);
  
  // Check deletion status using DocumentDeletionService
  const status = await this.deletionService.checkDeletionStatus(
    attachment.documentId,
    user.userId,
  );

  if (!status.canDelete) {
    if (status.isExpired) {
      throw new ForbiddenException(
        'Cannot delete: 72-hour window expired. Please submit a deletion request to DCC.',
      );
    }
    throw new ForbiddenException(
      'You do not have permission to delete this attachment',
    );
  }

  // Use DocumentDeletionService for self-deletion
  await this.deletionService.selfDelete(
    attachment.documentId,
    user.userId,
  );

  // Then delete the KPI attachment record and handle KPI status
  // ... existing logic for KPI status revert
}
```

### Step 4: Add Controller Endpoints

**File:** `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts`

```typescript
@Get('attachments/:id/deletion-status')
@CheckPolicies({ action: 'view', subject: 'Kpi' })
@ApiOperation({ summary: 'Get deletion status for KPI attachment' })
async getDeletionStatus(
  @CurrentUserWithDepartment() user: UserWithDepartments,
  @Param('id') attachmentId: string,
) {
  return this.attachmentService.getDeletionStatus(
    attachmentId,
    user.userId,
  );
}

@Post('attachments/:id/deletion-request')
@CheckPolicies({ action: 'create', subject: 'DeletionRequest' })
@ApiOperation({ summary: 'Submit deletion request for KPI attachment' })
async submitDeletionRequest(
  @CurrentUserWithDepartment() user: UserWithDepartments,
  @Param('id') attachmentId: string,
  @Body() body: { reason: string; replacementFileId?: string },
) {
  const attachment = await this.attachmentService.getAttachmentById(
    attachmentId,
    user,
  );
  
  return this.deletionService.submitDeletionRequest(
    attachment.documentId,
    user.userId,
    body.reason,
    body.replacementFileId,
  );
}
```

---

## Testing

1. ✅ Test deletion within 72 hours (should work)
2. ✅ Test deletion after 72 hours (should require DCC)
3. ✅ Test deletion status endpoint
4. ✅ Test deletion request submission
5. ✅ Test DCC can always delete

---

## Acceptance Criteria

- [ ] Deletion status endpoint returns correct status
- [ ] Delete endpoint enforces 72-hour rule
- [ ] Deletion requests can be submitted for KPI attachments
- [ ] All tests pass
- [ ] Error messages are clear

---

**Next:** `phase-02-frontend-ui-updates.md`
