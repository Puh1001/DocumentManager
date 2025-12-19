# Brainstorm: Realtime Folder Sync với WebSocket

**Date:** 2024-12-19  
**Context:** Thay thế manual sync bằng realtime updates khi có thay đổi ở file system  
**Requirement:** WebSocket để push updates đến frontend khi folders/files thay đổi

---

## Problem Statement

### Current Approach

- **Manual Sync:** Phải gọi `POST /api/storage/folders/sync` mỗi khi có thay đổi
- **No Real-time:** Frontend không biết khi nào có thay đổi ở file system
- **User Experience:** Phải refresh hoặc click "Làm mới" để thấy changes

### Desired Approach

- **Realtime Updates:** Tự động detect changes ở file system
- **WebSocket Push:** Push updates đến frontend ngay lập tức
- **Better UX:** Folder tree tự động update, không cần manual refresh

### Requirements

- Detect file/folder changes trên SMB share
- Push updates qua WebSocket đến connected clients
- Handle multiple clients (broadcast updates)
- Efficient: Không overload server với polling
- Reliable: Không miss changes

### Constraints

- **SMB Share:** Mounted trên Linux (`/mnt/smb`) hoặc UNC path trên Windows
- **Cross-platform:** Phải work trên cả Windows (dev) và Linux (prod)
- **Scalability:** Support nhiều concurrent connections
- **Performance:** Không impact performance của file operations

---

## Solution Options

### Option 1: File System Watcher + WebSocket ⭐ **RECOMMENDED**

**Approach:** Dùng file system watcher (chokidar/node-watch) để monitor changes, push qua WebSocket

**Architecture:**

```
┌─────────────┐
│ File System │
│  (SMB)      │
└──────┬──────┘
       │ Change detected
       ▼
┌─────────────┐
│ File Watcher│
│  Service    │
└──────┬──────┘
       │ Event: add/change/unlink
       ▼
┌─────────────┐
│ WebSocket   │
│  Gateway    │
└──────┬──────┘
       │ Broadcast
       ▼
┌─────────────┐
│ Frontend    │
│  Clients    │
└─────────────┘
```

**Implementation:**

**1. Install dependencies:**

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io chokidar
npm install -D @types/chokidar
```

**2. File Watcher Service:**

```typescript
// apps/api/src/modules/storage/services/folder-watcher.service.ts
import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as chokidar from "chokidar";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class FolderWatcherService implements OnModuleInit {
  private readonly logger = new Logger(FolderWatcherService.name);
  private watcher: chokidar.FSWatcher;
  private basePath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    // Get base path from SmbService or config
    this.basePath = configService.get("SMB_MOUNT_PATH", "/shared");
  }

  async onModuleInit() {
    // Watch for changes
    this.watcher = chokidar.watch(this.basePath, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      ignoreInitial: true, // Don't emit events for existing files
      awaitWriteFinish: {
        stabilityThreshold: 1000, // Wait 1s after file write finishes
        pollInterval: 100,
      },
    });

    this.watcher
      .on("addDir", (path) => this.handleFolderAdded(path))
      .on("unlinkDir", (path) => this.handleFolderRemoved(path))
      .on("add", (path) => this.handleFileAdded(path))
      .on("change", (path) => this.handleFileChanged(path))
      .on("unlink", (path) => this.handleFileRemoved(path))
      .on("error", (error) => this.logger.error(`Watcher error: ${error}`));

    this.logger.log(`Watching folder: ${this.basePath}`);
  }

  private handleFolderAdded(path: string) {
    this.eventEmitter.emit("folder.added", { path });
  }

  private handleFolderRemoved(path: string) {
    this.eventEmitter.emit("folder.removed", { path });
  }

  private handleFileAdded(path: string) {
    this.eventEmitter.emit("file.added", { path });
  }

  private handleFileChanged(path: string) {
    this.eventEmitter.emit("file.changed", { path });
  }

  private handleFileRemoved(path: string) {
    this.eventEmitter.emit("file.removed", { path });
  }
}
```

**3. WebSocket Gateway:**

```typescript
// apps/api/src/modules/storage/gateways/folder-sync.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  },
  namespace: "/folders",
})
export class FolderSyncGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FolderSyncGateway.name);
  private clients: Map<string, Socket> = new Map();

  handleConnection(client: Socket) {
    this.clients.set(client.id, client);
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @OnEvent("folder.added")
  handleFolderAdded(payload: { path: string }) {
    this.broadcast("folder:added", payload);
  }

  @OnEvent("folder.removed")
  handleFolderRemoved(payload: { path: string }) {
    this.broadcast("folder:removed", payload);
  }

  @OnEvent("file.added")
  handleFileAdded(payload: { path: string }) {
    this.broadcast("file:added", payload);
  }

  @OnEvent("file.changed")
  handleFileChanged(payload: { path: string }) {
    this.broadcast("file:changed", payload);
  }

  @OnEvent("file.removed")
  handleFileRemoved(payload: { path: string }) {
    this.broadcast("file:removed", payload);
  }

  private broadcast(event: string, payload: any) {
    this.server.emit(event, payload);
    this.logger.debug(`Broadcasted ${event}: ${payload.path}`);
  }

  @SubscribeMessage("sync:request")
  handleSyncRequest(client: Socket) {
    // Client requests full sync
    client.emit("sync:start");
    // Trigger sync service
    // ...
    client.emit("sync:complete");
  }
}
```

**4. Frontend Integration:**

```typescript
// apps/web/src/hooks/use-folder-sync.ts
import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

export function useFolderSync(onUpdate: () => void) {
  useEffect(() => {
    const socket: Socket = io("/folders", {
      path: "/api/socket.io",
    });

    socket.on("folder:added", () => {
      console.log("Folder added");
      onUpdate();
    });

    socket.on("folder:removed", () => {
      console.log("Folder removed");
      onUpdate();
    });

    socket.on("file:added", () => {
      console.log("File added");
      onUpdate();
    });

    socket.on("file:changed", () => {
      console.log("File changed");
      onUpdate();
    });

    socket.on("file:removed", () => {
      console.log("File removed");
      onUpdate();
    });

    return () => {
      socket.disconnect();
    };
  }, [onUpdate]);
}
```

**Pros:**

- ✅ **Real-time** - Instant updates khi có changes
- ✅ **Efficient** - Chỉ emit events khi có changes, không polling
- ✅ **Cross-platform** - chokidar works trên Windows và Linux
- ✅ **Reliable** - File watchers được test kỹ
- ✅ **Scalable** - WebSocket broadcast đến tất cả clients
- ✅ **Event-driven** - Clean architecture với EventEmitter

**Cons:**

- ❌ **SMB Limitations** - File watchers có thể không work tốt với network shares
- ❌ **Performance** - Watching nhiều files có thể impact performance
- ❌ **Complexity** - Cần setup WebSocket gateway và event system
- ❌ **Resource usage** - File watchers consume memory và CPU

**When to use:**

- Cần real-time updates
- File system là local hoặc mounted (không phải network share)
- Có thể chấp nhận complexity

---

### Option 2: Polling + WebSocket

**Approach:** Poll file system định kỳ, compare với database, push changes qua WebSocket

**Implementation:**

```typescript
@Injectable()
export class FolderSyncService {
  @Cron("*/30 * * * * *") // Every 30 seconds
  async pollAndSync() {
    const currentFolders = await this.smbService.listDirectory("");
    const dbFolders = await this.folderService.findAll();

    // Compare and detect changes
    const changes = this.detectChanges(currentFolders, dbFolders);

    if (changes.length > 0) {
      // Sync changes
      await this.folderService.syncWithFileSystem();

      // Broadcast via WebSocket
      this.eventEmitter.emit("folders.synced", changes);
    }
  }
}
```

**Pros:**

- ✅ **Simple** - Dễ implement
- ✅ **Reliable** - Không phụ thuộc vào file watchers
- ✅ **Works with SMB** - Polling works với network shares

**Cons:**

- ❌ **Not real-time** - Có delay (30s-60s)
- ❌ **Inefficient** - Polling mỗi 30s dù không có changes
- ❌ **Resource waste** - CPU và I/O overhead

**When to use:**

- SMB network share không support file watchers tốt
- Có thể chấp nhận delay
- Simple implementation priority

---

### Option 3: Hybrid: Watcher + Polling Fallback

**Approach:** Try file watcher first, fallback to polling nếu watcher không work

**Implementation:**

```typescript
@Injectable()
export class FolderSyncService {
  async initializeWatcher() {
    try {
      // Try file watcher
      this.watcher = chokidar.watch(this.basePath);
      this.logger.log("File watcher initialized");
    } catch (error) {
      // Fallback to polling
      this.logger.warn("File watcher failed, using polling");
      this.startPolling();
    }
  }
}
```

**Pros:**

- ✅ **Best of both** - Watcher khi có thể, polling khi không
- ✅ **Resilient** - Handle cả local và network shares

**Cons:**

- ❌ **Complex** - Phải implement cả 2 approaches
- ❌ **More code** - Nhiều code paths để maintain

**When to use:**

- Cần support cả local và network shares
- Có thể chấp nhận complexity

---

### Option 4: SMB Change Notifications (Advanced)

**Approach:** Dùng SMB protocol change notifications (nếu supported)

**Implementation:**

```typescript
// SMB protocol có change notifications
// Nhưng cần SMB library hỗ trợ (không có trong smb2)
// Có thể dùng smbclient với --notify flag
```

**Pros:**

- ✅ **Native** - SMB protocol level notifications
- ✅ **Efficient** - Server-side notifications

**Cons:**

- ❌ **Not available** - smb2 library không support
- ❌ **Complex** - Cần implement SMB protocol level
- ❌ **Unreliable** - Không phải tất cả SMB servers support

**When to use:**

- **NOT RECOMMENDED** - Quá complex, không có library support

---

## Comparison Matrix

| Solution              | Real-time             | Efficiency           | Complexity           | SMB Support          | Score    |
| --------------------- | --------------------- | -------------------- | -------------------- | -------------------- | -------- |
| **File Watcher + WS** | ⭐⭐⭐⭐⭐ Excellent  | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Medium        | ⭐⭐⭐ Good          | **9/10** |
| **Polling + WS**      | ⭐⭐ Poor (30s delay) | ⭐⭐ Poor            | ⭐⭐ Low             | ⭐⭐⭐⭐⭐ Excellent | **6/10** |
| **Hybrid**            | ⭐⭐⭐⭐ Good         | ⭐⭐⭐⭐ Good        | ⭐⭐⭐⭐ High        | ⭐⭐⭐⭐⭐ Excellent | **8/10** |
| **SMB Notifications** | ⭐⭐⭐⭐⭐ Excellent  | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐⭐ Very High | ⭐⭐⭐⭐⭐ Excellent | **5/10** |

---

## Recommended Solution

### **Option 1: File System Watcher + WebSocket** ⭐ **BEST**

**Rationale:**

1. **Real-time updates** - Instant notifications
2. **Efficient** - Chỉ emit khi có changes
3. **Proven technology** - chokidar và Socket.IO đều mature
4. **Cross-platform** - Works trên Windows và Linux
5. **Good UX** - Users thấy changes ngay lập tức

**Architecture:**

```
┌─────────────────┐
│  SMB Share      │
│  /mnt/smb       │
└────────┬────────┘
         │
         │ Mounted
         ▼
┌─────────────────┐
│  File Watcher   │
│  (chokidar)     │
└────────┬────────┘
         │ Events
         ▼
┌─────────────────┐
│  Event Emitter  │
│  (NestJS)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  WebSocket      │
│  Gateway        │
│  (Socket.IO)    │
└────────┬────────┘
         │ Broadcast
         ▼
┌─────────────────┐
│  Frontend       │
│  (React)        │
└─────────────────┘
```

**Implementation Plan:**

### Phase 1: Setup WebSocket Infrastructure

1. **Install dependencies:**

   ```bash
   npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
   npm install chokidar @nestjs/event-emitter
   npm install -D @types/chokidar
   ```

2. **Create WebSocket Gateway:**
   - `apps/api/src/modules/storage/gateways/folder-sync.gateway.ts`
   - Handle connections, broadcast events

3. **Update StorageModule:**
   - Import `EventEmitterModule`
   - Add `FolderSyncGateway`

### Phase 2: File Watcher Service

1. **Create FolderWatcherService:**
   - Watch base path với chokidar
   - Emit events khi có changes
   - Handle errors gracefully

2. **Integration:**
   - Listen to watcher events
   - Trigger sync nếu cần
   - Broadcast via WebSocket

### Phase 3: Frontend Integration

1. **Create React Hook:**
   - `apps/web/src/hooks/use-folder-sync.ts`
   - Connect to WebSocket
   - Listen to events
   - Trigger refresh

2. **Update Documents Page:**
   - Use hook để auto-refresh
   - Show notification khi có changes

### Phase 4: Error Handling & Fallback

1. **Watcher Failure:**
   - Fallback to polling nếu watcher không work
   - Log errors và notify admin

2. **WebSocket Reconnection:**
   - Auto-reconnect nếu connection lost
   - Queue updates khi disconnected

---

## Implementation Considerations

### 1. SMB Share Limitations

**Issue:** File watchers có thể không work tốt với network shares

**Solutions:**

- **Option A:** Mount SMB trên host, watch mounted path (works tốt)
- **Option B:** Fallback to polling nếu watcher fails
- **Option C:** Use SMB client library với change notifications (complex)

**Recommendation:** Mount trên host và watch mounted path (đã có trong architecture)

### 2. Performance Impact

**Concerns:**

- Watching nhiều files/folders
- Memory usage
- CPU overhead

**Mitigation:**

- Watch only base path, not recursive (chokidar default)
- Use `ignoreInitial: true` để không emit events cho existing files
- Debounce events nếu có nhiều changes cùng lúc
- Monitor performance và adjust

### 3. WebSocket Scalability

**Concerns:**

- Nhiều concurrent connections
- Memory usage per connection
- Broadcast performance

**Solutions:**

- Use Socket.IO rooms để group clients
- Limit connections per user
- Use Redis adapter cho multiple servers (future HA)

### 4. Event Ordering

**Issue:** Events có thể arrive out of order

**Solution:**

- Include timestamp trong events
- Frontend sort events by timestamp
- Use sequence numbers nếu cần

### 5. Authentication

**Issue:** WebSocket connections cần authentication

**Solution:**

- Use Socket.IO middleware để verify JWT
- Reject connections without valid token
- Map socket to user ID

---

## Success Metrics

- ✅ **Real-time updates:** Changes appear trong < 2 seconds
- ✅ **Reliability:** Không miss changes (> 99%)
- ✅ **Performance:** CPU usage < 5% khi watching
- ✅ **Scalability:** Support 100+ concurrent connections
- ✅ **User Experience:** No manual refresh needed

---

## Alternative: Simpler Approach (YAGNI)

### **Option: Manual Sync Button + Optimistic Updates**

**Approach:** Keep manual sync, nhưng add "Auto-refresh" toggle với polling

**Implementation:**

```typescript
// Frontend: Toggle auto-refresh
const [autoRefresh, setAutoRefresh] = useState(false);

useEffect(() => {
  if (!autoRefresh) return;

  const interval = setInterval(() => {
    loadFolderTree();
  }, 30000); // Every 30s

  return () => clearInterval(interval);
}, [autoRefresh]);
```

**Pros:**

- ✅ **Simple** - Không cần WebSocket
- ✅ **YAGNI** - Chỉ implement khi cần
- ✅ **Works everywhere** - Không phụ thuộc file watchers

**Cons:**

- ❌ **Not real-time** - 30s delay
- ❌ **Polling overhead** - Inefficient

**When to use:**

- MVP phase
- Chưa cần real-time
- Muốn simple solution

---

## Decision Matrix

| Scenario              | Recommended Solution             | Reason             |
| --------------------- | -------------------------------- | ------------------ |
| **Need real-time**    | File Watcher + WebSocket         | Best UX, efficient |
| **MVP/Simple**        | Manual Sync + Polling Toggle     | YAGNI, simple      |
| **SMB network share** | Hybrid (Watcher + Polling)       | Handle limitations |
| **High scale**        | File Watcher + WebSocket + Redis | Scalable           |

---

## Final Recommendation

### **Start with File Watcher + WebSocket** ⭐

**Rationale:**

1. **User requirement:** "Tôi muốn sử dụng websocket" - Clear requirement
2. **Better UX:** Real-time updates improve user experience significantly
3. **Proven tech:** chokidar và Socket.IO đều mature và reliable
4. **Architecture ready:** Mounted SMB share works tốt với file watchers

**Implementation Steps:**

1. **Phase 1:** Setup WebSocket infrastructure (1-2 days)
2. **Phase 2:** Implement file watcher service (1 day)
3. **Phase 3:** Frontend integration (1 day)
4. **Phase 4:** Testing và optimization (1 day)

**Total:** ~4-5 days

**Fallback Plan:**

- Nếu file watcher không work với SMB share → Fallback to polling
- Nếu WebSocket có issues → Keep manual sync button

---

## Open Questions

1. **SMB Share Type:** SMB share có phải là network share hay mounted local?
   - **Answer:** Mounted trên Linux (`/mnt/smb`), UNC trên Windows
   - **Impact:** File watchers sẽ work tốt với mounted paths

2. **Change Frequency:** Có bao nhiêu changes mỗi ngày?
   - **Impact:** High frequency → Cần debouncing

3. **Concurrent Users:** Có bao nhiêu users cùng lúc?
   - **Impact:** High concurrency → Cần Redis adapter

4. **Network Reliability:** Network có stable không?
   - **Impact:** Unstable → Cần reconnection logic

---

## Next Steps

1. **Clarify requirements:** Confirm SMB share setup và change frequency
2. **Choose approach:** File Watcher + WebSocket (recommended)
3. **Implement:** Follow implementation plan
4. **Test:** Verify real-time updates work
5. **Monitor:** Track performance và reliability

---

**Decision:** **File System Watcher + WebSocket** là best solution cho real-time folder sync. Approach này đảm bảo real-time updates, efficient resource usage, và good user experience.
