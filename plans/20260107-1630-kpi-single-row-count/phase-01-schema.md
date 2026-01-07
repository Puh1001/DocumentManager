# Phase 1: Database Schema

**Status:** 🔲 Pending

---

## Changes

Add `rowMode` enum and field:

```prisma
enum RowMode {
  SINGLE  // 1 dòng: ACTUAL only
  DOUBLE  // 2 dòng: TARGET + ACTUAL
}

model KpiRecord {
  // ... existing fields ...
  rowMode     RowMode?    @map("row_mode") // Nullable, only for COUNT tables
}
```

## Migration

```bash
cd apps/api
npx prisma migrate dev --name add_row_mode_to_kpi_records
```

## Implementation

- [ ] Add RowMode enum
- [ ] Add rowMode field (nullable)
- [ ] Run migration
- [ ] Generate Prisma client

