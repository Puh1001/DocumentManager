# Phase 2: Status Transition Validation

**Priority:** Medium  
**Time:** 20 minutes

## Problem

No validation for status transitions. Any status can change to any other status.

## Solution

Add validation method to enforce valid status transitions.

## Files to Modify

- `apps/api/src/modules/kpi/services/kpi-record.service.ts`

## Valid Transitions

```
PENDING → IN_PROGRESS, COMPLETED
IN_PROGRESS → COMPLETED, PENDING
COMPLETED → IN_PROGRESS, PENDING
```

## Implementation

### Add Validation Method

```typescript
/**
 * Validate if status transition is allowed
 */
private validateStatusTransition(
  currentStatus: KpiStatus,
  newStatus: KpiStatus
): void {
  // Same status is always allowed
  if (currentStatus === newStatus) {
    return;
  }

  const allowedTransitions: Record<KpiStatus, KpiStatus[]> = {
    [KpiStatus.PENDING]: [KpiStatus.IN_PROGRESS, KpiStatus.COMPLETED],
    [KpiStatus.IN_PROGRESS]: [KpiStatus.COMPLETED, KpiStatus.PENDING],
    [KpiStatus.COMPLETED]: [KpiStatus.IN_PROGRESS, KpiStatus.PENDING],
  };

  const allowed = allowedTransitions[currentStatus] || [];
  
  if (!allowed.includes(newStatus)) {
    throw CustomException.badRequest(
      ErrorCodes.INVALID_INPUT,
      `Invalid status transition: ${currentStatus} → ${newStatus}`
    );
  }
}
```

### Update updateStatus Method

```typescript
async updateStatus(id: string, status: KpiStatus, user: UserWithDepartments) {
  const existing = await this.prisma.kpiRecord.findUnique({
    where: { id },
    select: { id: true, departmentId: true, status: true },
  });

  // ... existing checks ...

  // Validate transition
  this.validateStatusTransition(existing.status, status);

  // ... continue with update ...
}
```

## Benefits

- Data integrity: Prevents invalid state transitions
- Business logic enforcement
- Clear error messages for invalid transitions

## Testing

- Valid transitions: PENDING → COMPLETED (pass)
- Invalid transitions: COMPLETED → PENDING (fail)
- Same status: PENDING → PENDING (pass)
