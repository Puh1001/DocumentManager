# KPI Status Completion Tracking Implementation Plan

**Created:** 2026-01-21  
**Status:** Ready for Implementation  
**Priority:** Medium

## Overview

Add automatic KPI status tracking that updates to COMPLETED when files are uploaded. Provides manual status management and handles edge cases like attachment deletion.

## Current State Analysis

- KpiRecord model: NO status field
- KpiAttachmentService.uploadAttachment(): uploads files, no status update
- No mechanism to track KPI completion
- No API for manual status updates

## Proposed Solution

Add status tracking to KpiRecord with automatic updates on file upload/delete operations. Simple, minimal changes to existing codebase.

## Implementation Phases

### Phase 1: Database Schema Migration
**File:** `phase-01-database-schema-migration.md`  
**Status:** Pending  
**Description:** Add status enum and field to KpiRecord model

### Phase 2: Service Layer Updates
**File:** `phase-02-service-layer-updates.md`  
**Status:** Pending  
**Description:** Update KpiRecordService for status management, modify KpiAttachmentService for auto-updates

### Phase 3: Controller & DTO Updates
**File:** `phase-03-controller-dto-updates.md`  
**Status:** Pending  
**Description:** Add API endpoint for manual status updates, update DTOs

### Phase 4: Edge Case Handling
**File:** `phase-04-edge-case-handling.md`  
**Status:** Pending  
**Description:** Handle attachment deletion, multiple attachments, status transitions

### Phase 5: Testing
**File:** `phase-05-testing.md`  
**Status:** Pending  
**Description:** Unit tests, integration tests, edge case validation

## Key Design Decisions

### Status Enum Values
- `PENDING`: Initial state (default)
- `IN_PROGRESS`: Work started (manual only)
- `COMPLETED`: Files uploaded (auto or manual)

### Auto-Update Trigger
- Upload attachment → COMPLETED
- Delete last attachment → PENDING (optional behavior)

### Manual Override
- Allow manual status change via PATCH endpoint
- Admin/Boss/Department users can update
- kpi_viewer_all role: read-only (no updates)

## Dependencies

- Prisma migrations
- Existing KPI services/controllers
- Current authentication & authorization system

## Risk Assessment

**Low Risk:**
- Additive changes (no breaking changes)
- Simple enum field addition
- Existing patterns (displayType, rowMode similar)

**Considerations:**
- Migration for existing records (default to PENDING)
- Performance impact minimal (simple enum field)

## Timeline Estimate

- Phase 1: 30 mins (schema + migration)
- Phase 2: 1 hour (service layer)
- Phase 3: 30 mins (controller + DTOs)
- Phase 4: 45 mins (edge cases)
- Phase 5: 1 hour (tests)

**Total:** ~3.5 hours

## Success Criteria

- [ ] Status field added to KpiRecord
- [ ] Migration runs successfully
- [ ] Upload attachment → auto-updates to COMPLETED
- [ ] Manual status update API works
- [ ] Delete attachment → status reverts (if last attachment)
- [ ] All tests pass
- [ ] No breaking changes to existing APIs
