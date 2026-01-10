# KPI Signed PDF Upload & Permissions - Plan

## Overview

- **Goal:** Allow users to upload signed KPI PDFs and let boss UI view them with fine-grained permissions (view / download / print / copy).
- **Scope:** Backend KPI & storage modules, authorization model, frontend boss KPI UI, PDF viewer integration, tests.

## Phases

- **Phase 01 - Backend Data Model & API**
  - Status: TODO
  - Description: Extend schema and NestJS API to support KPI attachments and permission-aware endpoints.
  - Details: `phase-01-backend-kpi-pdf-api.md`

- **Phase 02 - Frontend Boss KPI UI & Viewer**
  - Status: ✅ Completed
  - Description: Add attachment column, integrate viewer, and enforce permissions on buttons.
  - Details: `phase-02-frontend-boss-kpi-ui.md`

- **Phase 03 - Authorization & Permission Management**
  - Status: ✅ Completed
  - Description: Wire actions (view/download/print/copy) into CASL abilities and permission UI.
  - Details: `phase-03-authorization-kpi-pdf-permissions.md`

- **Phase 04 - Testing & QA**
  - Status: Planned
  - Description: Unit/integration tests for backend, frontend flows, and regression around document permissions.
  - Details: `phase-04-testing-and-qa.md`

## Links

- Research:
  - `research/researcher-01-backend-kpi-pdf.md`
  - `research/researcher-02-frontend-boss-kpi-ui.md`
- Scout: (populate after using /scout if needed)
- Related plans:
  - `../20241222-1430-kpi-tab-implementation/plan.md`
  - `../251218-1102-iso-document-management/plan.md`

## Notes

- Respect existing document storage model (SMB + Document entity).
- Reuse viewer and copy-protection mechanisms.
- Permissions for **view / download / print / copy / edit** are assigned explicitly per role (no default grants).
- Ensure detailed audit logging for who viewed, uploaded, downloaded, printed, copied, or edited KPI PDFs.
- All files are stored on the existing shared network drive already connected to the system.
