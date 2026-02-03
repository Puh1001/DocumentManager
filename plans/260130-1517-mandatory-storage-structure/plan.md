# Mandatory Storage Structure Redesign

**Created:** 2026-01-30  
**Status:** Planning  
**Priority:** High

## Overview

Redesign storage structure to enforce MANDATORY format: Each department has ONE storage folder containing 4 folders (KPI, ISO_documents, Maintenance, Delete_files). Files stored directly in section folders (not in "current" subfolder). Versions stored in "versions" subfolder. Auto-create structure when department is created.

## Requirements Summary

**MANDATORY Storage Format:**
- `[department]` contains 4 folders: `KPI`, `ISO_documents`, `Maintenance`, `Delete_files`
- Inside each of these 4 folders:
  - Files stored DIRECTLY (not in "current" subfolder)
  - One `versions` folder for changed files
- Deleted files moved to `Delete_files` and removed from original folder
- When department is created, system MUST automatically create this structure
- Files on SMB stored using ID (like current) but displayed using text filename from DB

**Current Structure:**
- `[department]/KPI/current/` + `[department]/KPI/versions/`
- `[department]/Documents/current/` + `[department]/Documents/versions/`

**Target Structure:**
- `[department]/KPI/{fileId}.ext` + `[department]/KPI/versions/`
- `[department]/ISO_documents/{fileId}.ext` + `[department]/ISO_documents/versions/`
- `[department]/Maintenance/{fileId}.ext` + `[department]/Maintenance/versions/`
- `[department]/Delete_files/` (for deleted files)

## Implementation Phases

### Phase 01: Storage Path Builder Update
**Status:** Pending  
**File:** [phase-01-storage-path-builder.md](phase-01-storage-path-builder.md)  
**Description:** Update StoragePathBuilder to use new structure (files directly in section, not in "current").

### Phase 02: Department Folder Auto-Creation
**Status:** Pending  
**File:** [phase-02-department-folder-auto-creation.md](phase-02-department-folder-auto-creation.md)  
**Description:** Hook into DepartmentService.create() to auto-create mandatory folder structure.

### Phase 03: Version Service Migration
**Status:** Pending  
**File:** [phase-03-version-service-migration.md](phase-03-version-service-migration.md)  
**Description:** Update VersionService to use new paths (files directly in section, versions in versions/).

### Phase 04: Document Service Updates
**Status:** Pending  
**File:** [phase-04-document-service-updates.md](phase-04-document-service-updates.md)  
**Description:** Update DocumentService to use new structure. Handle ISO_documents section.

### Phase 05: Deletion Service Updates
**Status:** Pending  
**File:** [phase-05-deletion-service-updates.md](phase-05-deletion-service-updates.md)  
**Description:** Update deletion workflow to move files to Delete_files folder.

### Phase 06: Migration Script
**Status:** Pending  
**File:** [phase-06-migration-script.md](phase-06-migration-script.md)  
**Description:** Create migration script to move existing files from "current" to section root.

### Phase 07: Testing & Validation
**Status:** Pending  
**File:** [phase-07-testing-validation.md](phase-07-testing-validation.md)  
**Description:** Test new structure, validate file operations, verify auto-creation.

## Research Reports

- [researcher-01-report.md](research/researcher-01-report.md) - Current storage structure analysis
- [researcher-02-report.md](research/researcher-02-report.md) - Department creation flow analysis

## Dependencies

- PostgreSQL database
- Prisma ORM
- NestJS backend
- SMB Service
- Folder Service
- Version Service
- Document Service
- Department Service

## Timeline Estimate

- Phase 01: 1-2 hours (StoragePathBuilder update)
- Phase 02: 2-3 hours (Department auto-creation hook)
- Phase 03: 2-3 hours (VersionService migration)
- Phase 04: 3-4 hours (DocumentService updates)
- Phase 05: 2-3 hours (DeletionService updates)
- Phase 06: 4-5 hours (Migration script)
- Phase 07: 3-4 hours (Testing)

**Total:** ~17-24 hours

## Success Criteria

- Mandatory folder structure auto-created when department is created
- Files stored directly in section folders (KPI, ISO_documents, Maintenance)
- Versions stored in versions/ subfolder
- Deleted files moved to Delete_files folder
- Files on SMB use ID-based naming
- Display uses text filename from DB
- Migration script successfully moves existing files
- All tests pass
- Backward compatibility maintained during migration
