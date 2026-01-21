# Phase 3: Type Safety & Permission Decorators

**Priority:** Low  
**Time:** 15 minutes

## Changes

### 1. Use Enum Constants (Type Safety)

Replace string literals with KpiStatus enum.

**File:** `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`

```typescript
// Before
data: { status: "COMPLETED" }

// After
import { KpiStatus } from "@prisma/client";
data: { status: KpiStatus.COMPLETED }
```

### 2. Add Permission Decorators

Make permission checks explicit.

**File:** `apps/api/src/modules/kpi/controllers/kpi-record.controller.ts`

```typescript
import { CheckPolicies } from "@/modules/authorization/decorators/check-policies.decorator";

@Patch(":id/status")
@CheckPolicies({ action: "update", subject: "Kpi" })
@ApiOperation({ summary: "Update KPI record status" })
async updateStatus(...) { ... }
```

## Benefits

- Type safety: Compile-time errors for invalid status values
- Explicit permissions: Clear security requirements
- Better IDE support: Autocomplete for enum values

## Files to Modify

1. `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`
2. `apps/api/src/modules/kpi/controllers/kpi-record.controller.ts`
