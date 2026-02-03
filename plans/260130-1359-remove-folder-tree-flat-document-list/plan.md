# Plan: Remove Folder Tree - Flat Document List UI

**Created:** 2026-01-30  
**Status:** Draft — awaiting review

## Objective

Redesign ISO Document page UI to match client requirements:
- Remove folder tree sidebar
- Display flat document list (all documents)
- Show table with filters (Status, Level, Department)
- Keep existing table columns and functionality

## Phases

| Phase | Description | Status | Link |
|-------|-------------|--------|------|
| 1 | Backend API: List all documents endpoint | Done | [phase-01-backend-api.md](phase-01-backend-api.md) |
| 2 | Frontend: Remove folder tree, update UI | Done | [phase-02-frontend-redesign.md](phase-02-frontend-redesign.md) |
| 3 | Testing & documentation | Done | [phase-03-testing-and-docs.md](phase-03-testing-and-docs.md) |

## Key Dependencies

- Phase 2 depends on Phase 1 (new API endpoint)
- Phase 3 runs after Phase 2

## Approach

- **Backend:** New `GET /storage/documents` endpoint with filters (status, departmentId, level)
- **Frontend:** Remove folder tree, load all documents, update filters
- **Upload:** Show folder picker dialog when uploading
- **Level filter:** Placeholder (future schema extension)

## Research

- [researcher-01-report.md](research/researcher-01-report.md) — API endpoint design
- [researcher-02-report.md](research/researcher-02-report.md) — Frontend UI redesign

## Unresolved

- Upload flow: folder picker dialog vs separate page?
- Level filter: placeholder or hide until schema extended?
