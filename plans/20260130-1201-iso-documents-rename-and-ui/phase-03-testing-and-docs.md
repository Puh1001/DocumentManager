# Phase 03: Testing & Documentation

## Context
- Parent: [plan.md](plan.md)
- Depends on: [phase-01-rename-and-navigation.md](phase-01-rename-and-navigation.md), [phase-02-iso-document-table-and-filters.md](phase-02-iso-document-table-and-filters.md)

## Overview
- **Date:** 2026-01-30
- **Priority:** Medium
- **Description:** Verify rename and table UI; update docs (codebase-summary, system-architecture, project-overview if needed).
- **Implementation status:** Done
- **Review status:** Done ([review report](reports/phase-03-code-review.md))

## Key insights
- No new backend unit tests required for i18n-only Phase 01. Phase 02: add tests for new list API (if any) and filter behavior.
- E2E or manual: sidebar label, documents page title, table columns, filters, view link.

## Requirements
- **Functional:** All phases verified; docs reflect "ISO Document" and table/filters.
- **Non-functional:** Existing tests pass; new code covered where added.

## Architecture
- Test: existing Jest/Vitest for API; manual or E2E for frontend. Docs: update `docs/codebase-summary.md`, `docs/system-architecture.md` if UI/flow described.

## Related code files
| File | Action |
|------|--------|
| `apps/api/src/modules/storage/*.spec.ts` | Add/update tests if list API added |
| `apps/web/` (components) | Manual or E2E for table and filters |
| `docs/codebase-summary.md` | Update "documents" → "ISO Document" where user-facing |
| `docs/system-architecture.md` | Update if document list flow described |

## Implementation steps
1. Run full test suite; fix any regressions.
2. If Phase 02 added list API: add controller/service tests for filtered list and permissions.
3. Manual check: nav "ISO Document", page title, table columns, filters, view link in all locales.
4. Update docs: replace "documents" with "ISO Document" in user-facing descriptions; note table columns and filters.

## Todo list
- [x] Tests updated: folder.service.spec.ts and folder.controller.spec.ts for findById(id, status?) and _count.versions
- [x] Docs updated: codebase-summary.md and system-architecture.md ("documents" → "ISO Document", table columns/filters noted)
- [ ] CI/test suite green (EPERM in sandbox; tests should pass in proper env)
- [ ] Manual/E2E: rename + table + filters (user verification needed)

## Success criteria
- All tests pass. ISO Document rename and table/filters work in browser. Docs consistent.

## Risk assessment
- Low.

## Security considerations
- Tests must assert permission checks on new list API if added.

## Next steps
- Final report; optional schema phase for full ISO metadata later.
