# Phase 1: Database Schema

**Parent Plan:** [plan.md](./plan.md)  
**Status:** 🔲 Pending  
**Priority:** High

---

## Overview

Add `displayType` field to KpiRecord model to differentiate between percentage and count tables.

## Changes

### Prisma Schema

Add enum and field to `schema.prisma`:

```prisma
enum DisplayType {
  PERCENTAGE // Default: show efficiency calculations
  COUNT      // Show only actual counts vs targets
}

model KpiRecord {
  // ... existing fields ...
  displayType  DisplayType @default(PERCENTAGE) @map("display_type")
  // ... rest of model ...
}
```

### Migration

Run migration command:
```bash
cd apps/api
npx prisma migrate dev --name add_display_type_to_kpi_records
```

## Implementation Steps

- [ ] Add DisplayType enum to schema.prisma
- [ ] Add displayType field to KpiRecord model
- [ ] Run migration
- [ ] Regenerate Prisma client
- [ ] Verify migration applied successfully

## Files to Modify

- `apps/api/prisma/schema.prisma`

## Success Criteria

- [ ] Migration runs without errors
- [ ] displayType field exists in database
- [ ] Existing records default to PERCENTAGE

