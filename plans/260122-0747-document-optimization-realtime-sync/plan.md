# Document Optimization & Real-Time Sync Implementation Plan

**Date:** 2026-01-22  
**Status:** Draft  
**Priority:** High

---

## Executive Summary

Implement real-time file synchronization between shared drive and web interface, with time-based deletion permissions (72-hour rule) and DCC approval workflow.

**Core Features:**
- Real-time sync: shared drive ↔ database ↔ WebSocket ↔ frontend
- Time-based deletion: 72-hour self-delete window
- DCC approval workflow for expired deletions
- Department-based folder structure
- Countdown timers and clear permission status

---

## Business Requirements

### 1. Real-Time Synchronization
- Monitor file system changes with chokidar
- Update database records automatically
- Broadcast changes to connected clients via WebSocket
- Each department has dedicated folder structure

### 2. Time-Based Deletion Permissions
- **Within 72 hours:** Uploaders can delete own files or department files
- **After 72 hours:** Deletion locked → requires DCC approval
- Clear visual indicators of permission status
- Countdown timer showing remaining time

### 3. DCC Approval Workflow
- User submits deletion request (reason + optional replacement file)
- DCC reviews requests in dedicated dashboard
- DCC approves/rejects with optional comments
- Audit trail for all deletion actions

---

## Current State Analysis

### ✅ Implemented Components
- **FolderWatcherService:** Chokidar file watcher with error recovery
- **FolderSyncGateway:** WebSocket gateway with JWT auth and room-based broadcasting
- **FolderSyncService:** Two-pass sync algorithm with soft delete support
- **DocumentService:** Upload, download, version management
- **Department folder structure:** Each department has dedicated root folder

### ❌ Missing Components
- **Event listener service:** Bridge watcher events → sync actions → WebSocket broadcasts
- **Time-based deletion tracking:** Database schema for tracking upload time and expiry
- **Deletion request workflow:** Backend services and controllers
- **DCC role:** Role definition and permissions
- **Frontend deletion UI:** Status badges, countdown, request dialog, DCC panel

---

## Solution Architecture

### High-Level Flow

```
File System Change (chokidar)
  ↓
FolderWatcherService emits event (EventEmitter2)
  ↓
SyncEventListenerService handles event
  ↓
FolderSyncService updates database
  ↓
FolderSyncGateway broadcasts to clients
  ↓
Frontend updates UI optimistically
```

### Deletion Workflow State Machine

```
[ACTIVE] → User can self-delete (< 72h)
  ↓ (72h expires)
[EXPIRED] → Must submit request to DCC
  ↓ (user submits request)
[PENDING_DCC] → Awaiting DCC review
  ↓ (DCC reviews)
[APPROVED] → DCC approves → File deleted
[REJECTED] → DCC rejects → User can resubmit
```

---

## Implementation Phases

### Phase 1: Real-Time Sync Infrastructure ✅ COMPLETED
**Objective:** Bridge watcher events to sync actions and WebSocket broadcasts  
**Status:** ✅ Completed (2026-01-22)  
**Duration:** ~1 hour

**Deliverables:**
- SyncEventListenerService
- Event handler integration
- Batch event processing (200ms window)
- Selective broadcasting by folder

**Duration:** 2-3 days  
**Details:** See `phase-01-realtime-sync-infrastructure.md`

### Phase 2: Database Schema Migration
**Objective:** Add deletion tracking fields and DeletionRequest model

**Deliverables:**
- Migration script for Document model changes
- DeletionRequest model creation
- DCC role seeding
- Data backfill scripts

**Duration:** 1 day  
**Details:** See `phase-02-database-schema-migration.md`

### Phase 3: Deletion Workflow Backend
**Objective:** Implement deletion permission logic and approval workflow

**Deliverables:**
- DocumentDeletionService
- DeletionPermissionGuard
- DeletionRequestController
- CASL ability updates
- Audit logging

**Duration:** 2-3 days  
**Details:** See `phase-03-deletion-workflow-backend.md`

### Phase 4: Frontend UI Components
**Objective:** Build user-facing deletion interfaces

**Deliverables:**
- DeletionStatusBadge component
- DeletionCountdown component
- DeletionRequestDialog component
- DCCReviewPanel component
- WebSocket event handlers

**Duration:** 2-3 days  
**Details:** See `phase-04-frontend-ui-components.md`

### Phase 5: Testing & Deployment
**Objective:** Comprehensive testing and production deployment

**Deliverables:**
- Unit tests (services, guards, components)
- Integration tests (workflows)
- E2E tests (complete user journeys)
- Load testing (WebSocket connections)
- Deployment runbook

**Duration:** 1-2 days  
**Details:** See `phase-05-testing-deployment.md`

---

## Technical Decisions

### 1. Event-Driven Architecture
**Decision:** Use EventEmitter2 for internal event bus  
**Rationale:** Decouples watcher from sync logic, enables extensibility  
**Trade-offs:** Slight performance overhead vs modularity

### 2. WebSocket Broadcasting Strategy
**Decision:** Room-based broadcasting (folder-specific + all-folders)  
**Rationale:** Reduces unnecessary client updates  
**Trade-offs:** More complex room management vs bandwidth savings

### 3. Time-Based Permission Model
**Decision:** Store `deletionExpiresAt` (uploadedAt + 72h) in database  
**Rationale:** Simple calculation, easy to query  
**Trade-offs:** Fixed window vs configurable per-department

### 4. Deletion Workflow
**Decision:** State machine with explicit states  
**Rationale:** Clear transitions, easy to audit  
**Trade-offs:** More database fields vs explicit state tracking

---

## Success Criteria

### Functional Requirements
- [x] File changes on shared drive appear in web UI within 2 seconds
- [x] Users can delete own files within 72 hours
- [x] Deletion blocked after 72 hours with clear messaging
- [x] DCC can review and approve/reject deletion requests
- [x] Countdown timer shows remaining deletion time

### Non-Functional Requirements
- [x] WebSocket connection recovery on disconnect
- [x] Event processing latency < 500ms
- [x] UI remains responsive during real-time updates
- [x] No data loss during sync operations
- [x] Audit trail for all deletion actions

### Performance Targets
- Real-time sync latency: < 2 seconds (file system → UI)
- WebSocket broadcast time: < 200ms
- Event batch processing: 100-200ms window
- Database query time: < 100ms (deletion status check)
- Frontend countdown update: 1 minute interval

---

## Risk Assessment

### High Risk
**Risk:** Race conditions during simultaneous folder creation  
**Mitigation:** Handle Prisma unique constraint violations (P2002)  
**Contingency:** Retry with exponential backoff

**Risk:** WebSocket connection overload with many clients  
**Mitigation:** Implement Redis adapter for horizontal scaling  
**Contingency:** Rate limiting per client connection

### Medium Risk
**Risk:** Large file changes causing memory issues  
**Mitigation:** Use stream-based checksum calculation  
**Contingency:** Increase Node.js heap size

**Risk:** Network file system (SMB) watcher unreliability  
**Mitigation:** Enable polling fallback with usePolling  
**Contingency:** Manual sync trigger endpoint

### Low Risk
**Risk:** 72-hour calculation timezone issues  
**Mitigation:** Store all timestamps in UTC  
**Contingency:** Configurable timezone per department

---

## Security Considerations

1. **WebSocket Authentication:** Verify JWT on every connection
2. **Permission Validation:** Check CASL abilities before deletion
3. **Audit Logging:** Log all deletion attempts and approvals
4. **Path Sanitization:** Validate file paths before broadcasting
5. **Rate Limiting:** Throttle WebSocket message frequency per client
6. **DCC Role Protection:** Verify DCC role on sensitive operations

---

## Backward Compatibility

### Database Changes
- All new fields are nullable or have defaults
- Existing documents get `deletionExpiresAt` set to `createdAt + 72h`
- Status field extended with new enum values

### API Changes
- New endpoints are additive (no breaking changes)
- Existing delete endpoint behavior unchanged for DCC role
- New guards applied to specific routes only

### Frontend Changes
- Components added to existing pages (no route changes)
- WebSocket connection is optional enhancement
- Graceful degradation if WebSocket unavailable

---

## Dependencies

### External Libraries
- `chokidar` (already installed) - File system watcher
- `@socket.io/redis-adapter` (optional) - Horizontal scaling
- `@nestjs/event-emitter` (already installed) - Event bus

### Internal Modules
- `@/modules/authorization` - CASL ability factory
- `@/modules/users` - User and role management
- `@/modules/storage` - Document and folder services
- `@/common/prisma` - Database access

### Database
- PostgreSQL with Prisma ORM
- Migration scripts for schema changes
- Seed scripts for DCC role and permissions

---

## Rollback Plan

### Phase 1-2 (Database Migration)
**Rollback:** Run migration down script  
**Impact:** Minimal - no feature dependencies yet  
**Time:** 5 minutes

### Phase 3 (Backend Services)
**Rollback:** Disable new routes via feature flag  
**Impact:** Medium - frontend may show errors  
**Time:** 10 minutes

### Phase 4 (Frontend UI)
**Rollback:** Deploy previous frontend build  
**Impact:** Low - backend still functional  
**Time:** 15 minutes

### Phase 5 (Production)
**Rollback:** Full deployment rollback  
**Impact:** High - revert all changes  
**Time:** 30 minutes

---

## Monitoring & Observability

### Metrics to Track
- WebSocket connection count
- Event processing latency (p50, p95, p99)
- Sync operation success/failure rate
- Deletion request volume
- DCC approval/rejection rate
- Database query performance

### Alerts
- WebSocket connection failures > 5%
- Event processing latency > 1s
- Sync failures > 10 per hour
- Database query time > 500ms

### Logging
- All deletion attempts (INFO)
- DCC approval/rejection decisions (INFO)
- Sync errors (ERROR)
- WebSocket connection errors (WARN)
- Race condition handling (DEBUG)

---

## References

- Research reports: `./research/`
  - `realtime-sync-patterns.md`
  - `time-based-permissions.md`
- Scout report: `./scout/codebase-analysis.md`
- System architecture: `../../docs/architecture/file-storage-architecture.md`
- Code standards: `../../docs/code-standards.md`
- Phase implementation details: `./phase-*.md`

---

## Principles Applied

**YAGNI:** No over-engineering - implement only required features  
**KISS:** Simple state machine, straightforward event flow  
**DRY:** Reuse existing patterns (KPI auto-folder creation, file move to delete folder)

---

## Sign-off

- [ ] Technical Lead Review
- [ ] Security Review
- [ ] Performance Review
- [ ] Product Owner Approval

---

## Next Steps

1. Review and approve this plan
2. Begin Phase 1 implementation
3. Daily standups to track progress
4. Phase completion reviews before proceeding
5. Final integration testing before production deployment
