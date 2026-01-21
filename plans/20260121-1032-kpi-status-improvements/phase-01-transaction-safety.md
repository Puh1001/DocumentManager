# Phase 1: Transaction Safety

**Priority:** High  
**Time:** 30 minutes

## Problem

Current code: Status update happens after attachment creation. If status update fails, inconsistent state (attachment exists but status still PENDING/IN_PROGRESS).

## Solution

Wrap attachment creation and status update in Prisma transaction for atomicity.

## Files to Modify

- `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`

## Implementation

### uploadAttachment Method

Wrap operations in `$transaction`:

```typescript
async uploadAttachment(...) {
  // ... existing validation ...

  // Use transaction for atomic operations
  return await this.prisma.$transaction(async (tx) => {
    const attachment = await tx.kpiAttachment.create({
      data: {
        kpiRecordId: record.id,
        documentId: document.id,
        description,
        createdById: user.userId,
      },
      include: { createdBy: true },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        userId: user.userId,
        action: "UPLOAD",
        resourceType: "KpiAttachment",
        resourceId: attachment.id,
        details: {
          kpiRecordId: record.id,
          documentId: document.id,
          fileName: document.fileName,
        },
      },
    });

    // Auto-update KPI status to COMPLETED (atomic with attachment)
    await tx.kpiRecord.update({
      where: { id: record.id },
      data: { status: KpiStatus.COMPLETED },
    });

    return attachment;
  });
}
```

### deleteAttachment Method

Wrap status revert in transaction:

```typescript
// Inside transaction: delete attachment + update status if needed
await this.prisma.$transaction(async (tx) => {
  // Delete attachment
  await tx.kpiAttachment.delete({
    where: { id: attachmentId },
  });

  // Check remaining
  const remainingCount = await tx.kpiAttachment.count({
    where: { kpiRecordId: attachment.kpiRecordId },
  });

  // Revert status if no attachments remain
  if (remainingCount === 0) {
    const kpiRecord = await tx.kpiRecord.findUnique({
      where: { id: attachment.kpiRecordId },
      select: { status: true },
    });

    if (kpiRecord?.status === KpiStatus.COMPLETED) {
      await tx.kpiRecord.update({
        where: { id: attachment.kpiRecordId },
        data: { status: KpiStatus.PENDING },
      });
    }
  }

  // Audit log
  await tx.auditLog.create({ ... });
});
```

## Benefits

- Atomicity: Either all operations succeed or all fail
- Data consistency: No orphaned attachments or incorrect status
- Rollback on error: Automatic rollback if any operation fails

## Testing

- Upload attachment, verify status = COMPLETED
- Simulate status update failure, verify attachment not created
- Delete last attachment, verify status = PENDING
