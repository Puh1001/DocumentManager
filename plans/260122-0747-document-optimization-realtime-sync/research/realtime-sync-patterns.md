# Real-Time File Synchronization Patterns Research

**Date:** 2026-01-22  
**Status:** Complete

## Overview

Research on real-time file system synchronization patterns for NestJS applications using chokidar and WebSocket broadcasting.

## Key Technologies

### 1. Chokidar File Watcher

**Purpose:** Monitor file system changes in real-time

**Key Configuration:**
```typescript
chokidar.watch(path, {
  persistent: true,
  ignoreInitial: true,  // Skip existing files on startup
  awaitWriteFinish: {
    stabilityThreshold: 2000,  // Wait 2s after file stops changing
    pollInterval: 100          // Check every 100ms
  },
  ignored: /(^|[\/\\])\../     // Ignore dotfiles
});
```

**Events Supported:**
- `add` - File added
- `change` - File modified
- `unlink` - File deleted
- `addDir` - Folder created
- `unlinkDir` - Folder deleted
- `error` - Watcher error

**Best Practices:**
- Use `awaitWriteFinish` to avoid partial reads during file writes
- Set `ignoreInitial: true` to prevent event flood on startup
- Implement error recovery with automatic restart
- Use `usePolling` for network file systems if native events unreliable

### 2. WebSocket Broadcasting with Socket.IO

**Architecture:**
```typescript
@WebSocketGateway({ cors: true, namespace: '/storage' })
export class FolderSyncGateway {
  @WebSocketServer() server: Server;
  
  broadcastFileEvent(payload: { event: string; path: string }) {
    this.server.emit('fileEvent', payload);
  }
}
```

**Room-Based Broadcasting:**
```typescript
// Subscribe to specific folder
client.join(`folder:${folderId}`);

// Broadcast to folder subscribers
this.server.to(`folder:${folderId}`).emit('sync-event', event);

// Broadcast to all subscribers
this.server.to('all-folders').emit('sync-event', event);
```

**Authentication:**
- Extract JWT token from handshake (auth or query)
- Verify token and store userId in socket
- Disconnect unauthorized clients immediately

### 3. Two-Pass Synchronization Pattern

**Current Implementation:**
```typescript
async syncWithFileSystem() {
  const seenPaths = new Set<string>();
  
  // Pass 1: Scan and update
  await scanFileSystem(seenPaths);
  
  // Pass 2: Cleanup orphans
  await cleanupOrphans(seenPaths);
}
```

**Benefits:**
- Efficient single-pass scanning
- Soft delete for deleted items
- Maintains referential integrity

## Integration Pattern

### Service Layer Architecture

```
FolderWatcherService (Chokidar)
  ↓ emit events via EventEmitter2
SyncEventListenerService
  ↓ process file system changes
FolderSyncService
  ↓ sync database records
FolderSyncGateway (WebSocket)
  ↓ broadcast to clients
Frontend Components
```

### Event Flow

1. **File System Event** → Chokidar detects change
2. **Event Emission** → EventEmitter2 broadcasts internal event
3. **Database Sync** → FolderSyncService updates database
4. **WebSocket Broadcast** → Gateway sends event to clients
5. **Client Update** → Frontend updates UI optimistically

## Performance Optimization

### 1. Batch Updates

**Problem:** High-frequency file events can flood clients

**Solution:** Accumulate events over short windows (100-200ms)
```typescript
private eventBuffer: Map<string, Event> = new Map();
private flushTimer: NodeJS.Timeout;

private scheduleFlush() {
  clearTimeout(this.flushTimer);
  this.flushTimer = setTimeout(() => {
    this.flushBufferedEvents();
  }, 200);
}
```

### 2. Selective Broadcasting

**Strategy:** Only broadcast to affected folder subscribers
```typescript
if (event.folderId) {
  // Specific folder + all-folders
  this.server.to(`folder:${event.folderId}`).emit('sync-event', event);
  this.server.to('all-folders').emit('sync-event', event);
}
```

### 3. Connection Management

**Redis Adapter** for horizontal scaling:
```typescript
import { createAdapter } from '@socket.io/redis-adapter';

const io = new Server({
  adapter: createAdapter(redisClient)
});
```

## Edge Cases & Solutions

### 1. Race Conditions

**Problem:** Multiple processes creating same folder simultaneously

**Solution:** Handle unique constraint violations gracefully
```typescript
try {
  folder = await prisma.folder.create({ data });
} catch (error) {
  if (error.code === 'P2002') {
    // Fetch existing folder
    folder = await prisma.folder.findUnique({ where: { path } });
  }
}
```

### 2. Large File Writes

**Problem:** Change events fired before write completes

**Solution:** Use `awaitWriteFinish` with appropriate threshold
```typescript
awaitWriteFinish: {
  stabilityThreshold: 2000,  // Increase for larger files
  pollInterval: 100
}
```

### 3. Network File Systems

**Problem:** Native watchers may miss events on SMB/CIFS

**Solution:** Enable polling fallback
```typescript
chokidar.watch(path, {
  usePolling: true,
  interval: 1000
});
```

### 4. Watcher Crashes

**Problem:** Watcher may crash due to permissions or file system issues

**Solution:** Automatic restart with backoff
```typescript
watcher.on('error', (error) => {
  logger.error('Watcher error:', error);
  setTimeout(() => {
    this.stopWatching();
    this.startWatching();
  }, 5000);
});
```

## Frontend State Management

### Optimistic Updates

```typescript
// 1. Update UI immediately
updateLocalState(fileId, changes);

// 2. Listen for server confirmation
socket.on('sync-event', (event) => {
  if (event.type === 'document_updated' && event.documentId === fileId) {
    // Confirmed - no action needed
  }
});

// 3. Handle conflicts
socket.on('sync-conflict', (event) => {
  // Revert optimistic update
  revertLocalState(fileId);
  showConflictMessage();
});
```

### Cache Invalidation

```typescript
socket.on('sync-event', (event) => {
  switch (event.type) {
    case 'folder_deleted':
      // Invalidate folder cache
      queryClient.invalidateQueries(['folders', event.folderId]);
      break;
    case 'document_updated':
      // Invalidate document cache
      queryClient.invalidateQueries(['documents', event.documentId]);
      break;
  }
});
```

## Security Considerations

1. **Token Validation:** Verify JWT on every WebSocket connection
2. **Permission Checks:** Ensure user has access to folders before broadcasting
3. **Rate Limiting:** Throttle WebSocket message frequency per client
4. **Path Sanitization:** Validate file paths before broadcasting

## Recommendations

1. **Current System:** Already implements chokidar + WebSocket pattern correctly
2. **Missing:** Event listener service to bridge watcher → sync → gateway
3. **Enhancement:** Add batch event processing to reduce WebSocket traffic
4. **Scaling:** Consider Redis adapter for multi-instance deployments
5. **Monitoring:** Add metrics for event processing latency and WebSocket connections

## References

- Chokidar documentation: https://github.com/paulmillr/chokidar
- Socket.IO NestJS integration: https://docs.nestjs.com/websockets/gateways
- Redis adapter: https://socket.io/docs/v4/redis-adapter/
