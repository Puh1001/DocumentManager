# Codebase Analysis - Document Optimization & Real-Time Sync

**Date:** 2026-01-22  
**Status:** Complete

## Current Implementation Overview

### Real-Time Sync Infrastructure (Existing)

#### 1. FolderWatcherService
**Location:** `apps/api/src/modules/storage/services/folder-watcher.service.ts`

**Current Capabilities:**
- Uses chokidar to watch file system changes
- Emits events via EventEmitter2
- Watches: add, change, unlink, addDir, unlinkDir
- Implements error recovery with automatic restart
- Platform-aware path handling (Windows UNC vs Linux mounted path)

**Configuration:**
```typescript
awaitWriteFinish: {
  stabilityThreshold: 2000,
  pollInterval: 100
}
ignoreInitial: true
```

**Status:** ✅ Fully implemented, production-ready

#### 2. FolderSyncService
**Location:** `apps/api/src/modules/storage/services/folder-sync.service.ts`

**Current Capabilities:**
- Two-pass sync algorithm (scan + cleanup)
- Methods: `syncWithFileSystem()`, `syncSingleFile()`, `deleteSingleFile()`
- Soft delete support
- Integration with DocumentSyncHandler, FolderSyncHandler, SyncDeletionHandler

**Missing:**
- Event listener to connect watcher events → sync methods
- Real-time sync trigger from file system events

#### 3. FolderSyncGateway
**Location:** `apps/api/src/modules/storage/gateways/folder-sync.gateway.ts`

**Current Capabilities:**
- WebSocket server with Socket.IO
- JWT authentication on connection
- Room-based subscriptions (folder-specific + all-folders)
- `broadcastSyncEvent()` method for broadcasting
- Event types: folder_added, folder_updated, folder_deleted, document_added, document_updated, document_deleted, sync_completed

**Status:** ✅ Fully implemented, ready for integration

### Document Management (Existing)

#### 1. DocumentService
**Location:** `apps/api/src/modules/storage/services/document.service.ts`

**Current Capabilities:**
- Upload, update, download, delete documents
- Version management via VersionService
- File streaming
- SHA-256 checksum calculation

**Missing Fields:**
- `uploadedBy` - Track who uploaded the file
- `uploadedAt` - Track when file was uploaded (uses `createdAt` currently)
- `deletionExpiresAt` - Track 72-hour deletion window

### Database Schema (Current)

#### Document Model
**Location:** `apps/api/prisma/schema.prisma`

**Existing Fields:**
```prisma
model Document {
  id             String         @id @default(uuid())
  name           String
  fileName       String
  fileType       String
  mimeType       String?
  fileSize       Int
  filePath       String
  checksum       String
  fileCreatedAt  DateTime?      // File system dates
  fileModifiedAt DateTime?
  folderId       String
  status         DocumentStatus @default(ACTIVE)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  
  folder      Folder
  versions    DocumentVersion[]
  permissions DocumentPermission[]
  kpiAttachments KpiAttachment[]
}
```

**Missing:**
- `uploadedBy` field (User relation)
- `deletionState` field (enum)
- `deletionExpiresAt` field (DateTime)
- `DeletionRequest` model

### Authorization (CASL)

**Location:** `apps/api/src/modules/authorization/factories/casl-ability.factory.ts`

**Current Capabilities:**
- Role-based permissions (admin, boss, manager, etc.)
- Folder-level permissions with inheritance
- Document-level permissions
- Module-level permissions (page access)

**Needs Extension:**
- Time-based deletion permissions
- DCC role permissions
- DeletionRequest permissions

## Department Folder Structure

### Current Structure (From System Architecture)
```
\\SMB_SERVER\Share\
├── {department}/
│   ├── Tài liệu ISO/
│   │   ├── current/
│   │   └── versions/
│   ├── KPI/
│   │   └── current/
│   ├── maintenance/
│   ├── documents/
│   └── delete files/
```

### Requirements
- Each department has dedicated folder at root level
- Folders are linked to departments via `departmentId` in Folder model
- Real-time sync must maintain this structure

## Integration Points

### 1. Missing: Sync Event Listener Service

**Purpose:** Bridge watcher events to sync actions and WebSocket broadcasts

**Required Functionality:**
```typescript
@Injectable()
export class SyncEventListenerService {
  constructor(
    private readonly folderSyncService: FolderSyncService,
    private readonly folderSyncGateway: FolderSyncGateway,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.setupListeners();
  }
  
  private setupListeners() {
    this.eventEmitter.on('file.added', this.handleFileAdded);
    this.eventEmitter.on('file.changed', this.handleFileChanged);
    this.eventEmitter.on('file.deleted', this.handleFileDeleted);
    this.eventEmitter.on('folder.added', this.handleFolderAdded);
    this.eventEmitter.on('folder.deleted', this.handleFolderDeleted);
  }
  
  // Handler methods...
}
```

### 2. Missing: Deletion Permission Logic

**Required Components:**
- `DeletionPermissionGuard` - Check 72-hour rule
- `DocumentDeletionService` - Handle deletion workflow
- `DeletionRequestController` - API endpoints
- Frontend components - Status badges, countdown, request dialog

### 3. Missing: DCC Role & Permissions

**Required Changes:**
- Add `dcc` role to database
- Add `manage:DeletionRequest` permission
- Update CASL ability factory
- Create DCC dashboard page

## API Routes (To Be Created)

### Document Deletion
```
GET    /documents/:id/deletion-status        # Check deletion status
DELETE /documents/:id                        # Self-delete (< 72h)
POST   /documents/:id/deletion-requests      # Submit DCC request
GET    /deletion-requests                    # List requests (DCC)
POST   /deletion-requests/:id/review         # Approve/reject (DCC)
```

## File Analysis

### Files to Modify

1. **schema.prisma**
   - Add `uploadedBy`, `deletionState`, `deletionExpiresAt` to Document
   - Create DeletionRequest model
   - Add User relations

2. **document.service.ts**
   - Track uploader on file upload
   - Set deletion expiry automatically
   - Update delete method to check permissions

3. **casl-ability.factory.ts**
   - Add DCC role permissions
   - Add time-based deletion rules

4. **storage.module.ts**
   - Add SyncEventListenerService provider
   - Wire up event listeners

### Files to Create

1. **sync-event-listener.service.ts**
   - Bridge watcher → sync → gateway

2. **document-deletion.service.ts**
   - Deletion workflow logic
   - Permission checks
   - Request management

3. **deletion-request.controller.ts**
   - API endpoints for deletion requests

4. **deletion-permission.guard.ts**
   - Time-based permission guard

5. Frontend Components:
   - `DeletionStatusBadge.tsx`
   - `DeletionCountdown.tsx`
   - `DeletionRequestDialog.tsx`
   - `DCCReviewPanel.tsx`

## Testing Considerations

### Unit Tests Required
- DeletionPermissionGuard logic
- 72-hour expiry calculation
- DCC approval workflow state transitions

### Integration Tests Required
- Real-time sync flow: file system → database → WebSocket
- Deletion request workflow: submit → review → execute
- Permission checks across different roles

### E2E Tests Required
- Upload file → delete within 72h (success)
- Upload file → wait 72h → attempt delete (blocked)
- Submit deletion request → DCC approves → file deleted
- WebSocket connection → file change → UI update

## Performance Considerations

1. **Event Batching:** High-frequency file events should be batched (200ms window)
2. **Selective Broadcasting:** Only broadcast to affected folder subscribers
3. **Query Optimization:** Index on `deletionExpiresAt` for expiry checks
4. **Cron Job:** Daily cleanup of expired states

## Security Considerations

1. **Permission Validation:** Verify user permissions on every deletion attempt
2. **JWT Verification:** Validate WebSocket connections
3. **Audit Logging:** Log all deletion attempts and approvals
4. **Path Sanitization:** Validate file paths before sync

## Migration Steps Required

1. Add new columns to Document table
2. Create DeletionRequest table
3. Backfill `uploadedBy` from DocumentVersion.createdBy
4. Backfill `deletionExpiresAt` for active documents
5. Create DCC role and assign to users
6. Seed permissions for DCC role

## Relevant Code Patterns

### KPI Attachment Auto-Folder Creation
**Reference:** KPI module implements similar auto-folder creation pattern

**Pattern to Reuse:**
```typescript
// Handle race conditions
try {
  folder = await prisma.folder.create({ data });
} catch (error) {
  if (error.code === 'P2002') {
    folder = await prisma.folder.findUnique({ where: { path } });
  }
}
```

### File Deletion with Move to "delete files"
**Reference:** KPI attachment deletion moves files instead of hard delete

**Pattern to Reuse:**
```typescript
// Find or create "delete files" folder
const deleteFolder = await findOrCreateDeleteFolder(departmentId);

// Move file physically
await smbService.rename(oldPath, newPath);

// Update document status
await prisma.document.update({
  data: { folderId: deleteFolder.id, status: 'DELETED' }
});
```

## Summary

**Current State:**
- ✅ File watcher implemented
- ✅ WebSocket gateway ready
- ✅ Sync service has required methods
- ✅ Department folder structure exists

**Missing Components:**
- ❌ Event listener to connect watcher → sync → gateway
- ❌ Time-based deletion tracking
- ❌ Deletion request workflow
- ❌ DCC role and permissions
- ❌ Frontend deletion status UI

**Estimated Effort:**
- Phase 1 (Real-time sync): 2-3 days
- Phase 2 (Time-based deletion schema): 1 day
- Phase 3 (Deletion workflow backend): 2-3 days
- Phase 4 (Frontend UI): 2-3 days
- Phase 5 (Testing & deployment): 1-2 days

**Total:** 8-12 days
