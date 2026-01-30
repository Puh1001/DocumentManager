# Phase 03: Testing & Documentation

## Context Links

- Parent: [plan.md](./plan.md)
- Depends on: [phase-01-database-and-api.md](./phase-01-database-and-api.md), [phase-02-frontend-month-selector-and-uploads.md](./phase-02-frontend-month-selector-and-uploads.md)
- Docs: `./docs/codebase-summary.md`, `./README.md`, `./docs/system-architecture.md`

## Overview

| Field | Value |
|-------|--------|
| Date | 2026-01-30 |
| Priority | Medium |
| Implementation status | Pending |
| Review status | Not started |
| Description | Tests for month-scoped attachments; update docs and API description. |

## Key Insights

- Existing KPI attachment tests: extend for month in create and list filter.
- Frontend: optional E2E or component test for month selector and filtered list.
- Docs: API table in README and system-architecture; codebase-summary KPI section.

## Requirements

### Functional

- Backend: unit/integration tests for list with/without month; create with month; validation (month &lt; 1, &gt; 12).
- Frontend: manual or automated test that changing month updates attachment list; upload with month persists.
- Docs: describe month parameter for GET/POST attachments; update KPI section to “monthly uploads”.

### Non-functional

- No regression: existing KPI record and metric tests still pass.
- Follow project test patterns (Jest, existing spec files).

## Architecture

- **API tests:** Use existing KPI attachment spec (e.g. `kpi-attachment.service.spec.ts` or controller spec). Add cases: create with month; list filtered by month; list without month returns all; invalid month rejected.
- **Docs:** Markdown updates only; no new services.

## Related Code Files

**Modify**

- `apps/api/src/modules/kpi/services/kpi-attachment.service.spec.ts` (or equivalent) — add tests for month filter and create with month.
- `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts` — ensure Swagger/OpenAPI documents `month` query and body.
- `README.md` — KPI section: mention monthly uploads and month parameter.
- `docs/system-architecture.md` — API section for `/kpi/records/:id/attachments`: add `?month=` and body `month`.
- `docs/codebase-summary.md` — KPI Tracking: add “month-scoped attachments (list/upload by month)”.

**Create**

- None required; optional E2E in existing suite.

## Implementation Steps

1. **Backend tests**
   - In attachment service spec: create attachment with `month: 3`; assert stored. List by record with `month: 3` returns it; with `month: 2` does not. List without month returns all (including NULL month if any). Invalid month (0, 13) in create returns validation error.

2. **Swagger/API docs**
   - List: `@ApiQuery({ name: 'month', required: false, type: Number, description: 'Filter by month 1-12' })`.
   - Upload: in DTO or form description, document `month` (1–12).

3. **README**
   - Under KPI or API: “Attachments can be filtered by month (query `month=1`…`12`). Upload accepts `month` to associate file with a given month.”

4. **system-architecture.md**
   - In KPI API block: GET attachments `?month=`, POST body `month`.

5. **codebase-summary.md**
   - KPI Tracking / Recent updates: add bullet for monthly KPI uploads (month selector, list/upload by month).

## Todo List

- [ ] Add attachment service/controller tests for month (list filter, create, validation).
- [ ] Document month in Swagger/OpenAPI for list and upload.
- [ ] Update README KPI/API section.
- [ ] Update system-architecture.md API section.
- [ ] Update codebase-summary.md KPI section.

## Success Criteria

- New tests pass; existing KPI tests still pass.
- API docs and README describe month parameter.
- codebase-summary and system-architecture reflect monthly uploads.

## Risk Assessment

- Low; documentation and test coverage only.

## Security Considerations

- None beyond existing KPI permission tests.

## Next Steps

- Final review of all three phases; then implementation in order 01 → 02 → 03.
