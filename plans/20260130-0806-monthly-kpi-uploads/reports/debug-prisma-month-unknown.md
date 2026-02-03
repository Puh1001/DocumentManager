# Debug: Prisma "Unknown argument `month`" on kpiAttachment.findMany

**Date:** 2026-01-30  
**Log source:** Terminal (API dev server)

---

## Problem Summary

At runtime, `kpiAttachment.findMany()` fails with:

```
Invalid `).kpiAttachment.findMany()` invocation in
.../kpi-attachment.service.ts:260:21
Unknown argument `month`. Available options are marked with ?.
```

The `where` clause includes `OR: [{ month: 1 }, { month: null }]`. Prisma rejects `month` as unknown.

---

## Root Cause

The **Prisma client** in use was generated from a schema that did **not** include the `month` field on `KpiAttachment`. So at runtime the client’s query builder does not accept `month` in the where clause.

- **Schema:** `prisma/schema.prisma` already has `month Int? @map("month")` on `KpiAttachment` and `@@index([kpiRecordId, month])`.
- **Migration:** `20260130084815_add_kpi_attachment_month/migration.sql` exists and adds the `month` column and index.
- **Code:** `kpi-attachment.service.ts` correctly builds `where: { kpiRecordId, OR: [{ month }, { month: null }] }`.

So the mismatch is between the **current schema** and the **generated client** (e.g. `node_modules/.prisma/client`): the client was not regenerated after adding `month`.

---

## Evidence

1. Error: `Unknown argument 'month'. Available options are marked with ?.` → client’s KpiAttachment model has no `month` in its where type.
2. Schema has `month Int?` on `KpiAttachment` (line 458).
3. Migration `20260130084815_add_kpi_attachment_month` adds the column and index.
4. Phase 01 notes mentioned running `prisma generate` locally after migration (sandbox could not run it).

---

## Fix Plan

1. **Apply migration** (if not already applied):
   ```bash
   cd apps/api && npx prisma migrate deploy
   ```
2. **Regenerate Prisma client** (required so `month` is in the client):
   ```bash
   cd apps/api && npx prisma generate
   ```
3. **Restart the API** (dev server) so it loads the new client.

After that, `kpiAttachment.findMany({ where: { kpiRecordId, OR: [{ month: 1 }, { month: null }] }, ... })` will run without the "Unknown argument `month`" error.

---

## EPERM on `prisma generate` (rename query_engine DLL)

**Logs (terminal 5):**
- `prisma migrate deploy` → **OK** (migration `20260130084815_add_kpi_attachment_month` applied).
- `prisma generate` → **FAIL**:
  ```
  EPERM: operation not permitted, rename
  'D:\documentsManager\node_modules\.prisma\client\query_engine-windows.dll.node.tmp21172'
  -> 'D:\documentsManager\node_modules\.prisma\client\query_engine-windows.dll.node'
  ```

### Root cause

Prisma generate downloads/builds a new query engine and tries to **replace** the existing `query_engine-windows.dll.node` by renaming a temp file over it. **EPERM** on that rename usually means:

1. **File in use:** A process has the current `query_engine-windows.dll.node` (or the folder) open — e.g. **API dev server** (`npm run dev`), another Node process, or Cursor/VS Code holding the file.
2. **Antivirus/security** locking the DLL.
3. **Permissions:** Terminal/user cannot write to `node_modules\.prisma\client` (less common).

### Fix plan

1. **Stop all processes that use the Prisma client:**
   - Stop the API dev server (Ctrl+C in the terminal where `npm run dev` or `npm run start:dev` runs).
   - Close any other terminal that might be running the API or tests.
2. **Retry generate:**
   ```bash
   cd apps/api && npx prisma generate
   ```
3. If it still fails:
   - Close Cursor/VS Code, run `npx prisma generate` in a **new** PowerShell/CMD outside the IDE, then reopen the project.
   - Or temporarily exclude `node_modules\.prisma` from real-time antivirus scanning.
4. After generate succeeds, **restart the API** so it loads the new client (with `month`).
