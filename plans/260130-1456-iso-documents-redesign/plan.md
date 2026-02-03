# ISO Documents Redesign - Client Table Requirements

**Created:** 2026-01-30  
**Status:** Planning  
**Priority:** High

## Overview

Redesign documents function to match new client table requirements. Add missing ISO document metadata fields (Level, Preparer, Reviewer, Approver, Approval Date, Receipt Date) to schema, API, and frontend.

## Requirements Summary

From client image:

- **Table Columns:** No., Title, Version, Level, Responsible Department, Preparer, Reviewer, Approver, Approval Date, Receipt Date, Storage Location, Status, uploadPDF, Actions
- **Filters:** Status, Level, Department (via dropdown)

**New Requirements:**

- **Upload:** Level is MANDATORY when uploading. Responsible Department automatically set to uploader's department.
- **Access Control:** Users see only their department's documents. Admin, DCC, Boss see all documents.
- **Auto-population:** Preparer, Reviewer, Approver, Approval Date, Receipt Date automatically filled by system.

**Current State:** Table structure exists but shows placeholders ("—") for Level, Preparer, Reviewer, Approver, Approval Date, Receipt Date.

**Target State:** All columns display actual data. Level required on upload. Department-based access control. Auto-populated fields.

## Implementation Phases

### Phase 00: Upload Requirements Implementation

**Status:** Pending  
**File:** [phase-00-upload-requirements.md](phase-00-upload-requirements.md)  
**Description:** Update upload flow to require level selection. Auto-set department from uploader. Auto-populate preparer and receipt date.

### Phase 01: Database Schema Extension

**Status:** Completed  
**File:** [phase-01-database-schema.md](phase-01-database-schema.md)  
**Description:** Add ISO metadata fields to Document model. Make level required (non-nullable). Add preparerId, reviewerId, approverId, approvalDate, receiptDate with User relations.

### Phase 02: Backend API Updates

**Status:** Completed  
**File:** [phase-02-backend-api.md](phase-02-backend-api.md)  
**Description:** Update API endpoints, DTOs, and services to support ISO metadata fields. Add update endpoint and enhance queries.

### Phase 03: Frontend Display Enhancement

**Status:** Completed  
**File:** [phase-03-frontend-display.md](phase-03-frontend-display.md)  
**Description:** Update DocumentList component to display actual data instead of placeholders. Format dates and user names.

### Phase 04: Frontend Editing Capability

**Status:** Pending  
**File:** [phase-04-frontend-editing.md](phase-04-frontend-editing.md)  
**Description:** Create ISO metadata edit dialog with user picker and date picker. Add edit action to table.

### Phase 05: Filtering Enhancement

**Status:** Pending  
**File:** [phase-05-filtering.md](phase-05-filtering.md)  
**Description:** Enable Level filter with actual data. Add optional user and date filters.

### Phase 06: Testing & Documentation

**Status:** Pending  
**File:** [phase-06-testing.md](phase-06-testing.md)  
**Description:** Write tests, update documentation, verify all features work correctly.

## Research Reports

- [researcher-01-report.md](research/researcher-01-report.md) - Database schema & API analysis
- [researcher-02-report.md](research/researcher-02-report.md) - Frontend UI & UX analysis
- [researcher-03-report.md](research/researcher-03-report.md) - Upload requirements & department-based access control

## Dependencies

- PostgreSQL database
- Prisma ORM
- NestJS backend
- Next.js frontend
- User management system (for preparer/reviewer/approver selection)

## Timeline Estimate

- Phase 00: 2-3 hours (upload requirements - frontend)
- Phase 01: 2-3 hours (schema + migration)
- Phase 02: 4-5 hours (API updates + access control)
- Phase 03: 2-3 hours (display updates)
- Phase 04: 4-5 hours (editing UI)
- Phase 05: 2-3 hours (filtering)
- Phase 06: 3-4 hours (testing)

**Total:** ~19-26 hours

## Success Criteria

- Level is required when uploading documents
- Responsible Department automatically set to uploader's department
- Users see only their department's documents (unless admin/dcc/boss)
- Admin, DCC, Boss see all documents
- Preparer, Reviewer, Approver, dates auto-populated by system
- All table columns display actual data (no placeholders)
- Level filter works with actual data
- All changes are backward compatible
- Tests pass
- Documentation updated
