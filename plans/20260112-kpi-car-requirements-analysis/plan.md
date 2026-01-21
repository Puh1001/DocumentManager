# KPI/CAR Requirements Implementation Plan

**Created:** 2026-01-12  
**Status:** 🔲 Planning  
**Priority:** HIGH  
**Estimated Duration:** 2-3 days

---

## Overview

Implementation plan for adding new KPI/CAR fields and validation logic based on customer requirements:
- Statistical Cycle (Month/Quarter/Year)
- KPI Status (Achieved/Not achieved)
- CAR workflow (Status, Non-conformance Item, PDF)
- Mandatory PDF upload validation

---

## Implementation Phases

| Phase | Name | Status | Progress | Duration |
|-------|------|--------|----------|----------|
| 1 | Database Schema Migration | 🔲 Pending | 0% | 1-2h |
| 2 | Backend DTOs and Enums | 🔲 Pending | 0% | 2-3h |
| 3 | Backend Service Validation | 🔲 Pending | 0% | 3-4h |
| 4 | Backend API Updates | 🔲 Pending | 0% | 2-3h |
| 5 | Frontend Form Updates | 🔲 Pending | 0% | 3-4h |
| 6 | Frontend Conditional Logic | 🔲 Pending | 0% | 2-3h |
| 7 | Frontend Attachment Updates | 🔲 Pending | 0% | 2-3h |
| 8 | Testing & Validation | 🔲 Pending | 0% | 4-6h |

**Total Estimated Time:** 19-28 hours (2.5-3.5 days)

---

## Dependencies

- Analysis document: `analysis.md`
- Summary document: `summary.md`
- Existing KPI module codebase
- Prisma schema and migrations

---

## Key Files

- [Phase 1: Database Schema Migration](./phase-01-database-schema-migration.md)
- [Phase 2: Backend DTOs and Enums](./phase-02-backend-dtos-enums.md)
- [Phase 3: Backend Service Validation](./phase-03-backend-service-validation.md)
- [Phase 4: Backend API Updates](./phase-04-backend-api-updates.md)
- [Phase 5: Frontend Form Updates](./phase-05-frontend-form-updates.md)
- [Phase 6: Frontend Conditional Logic](./phase-06-frontend-conditional-logic.md)
- [Phase 7: Frontend Attachment Updates](./phase-07-frontend-attachment-updates.md)
- [Phase 8: Testing & Validation](./phase-08-testing-validation.md)

---

## Success Criteria

- All new fields added to database schema
- Conditional validation working correctly
- Mandatory PDF uploads enforced
- Existing records migrated with defaults
- No breaking changes to existing functionality
- All translations added (EN, VI, ZH)
