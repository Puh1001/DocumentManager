# Phase 2: Register WebSocket Components

**Parent Plan:** [plan.md](./plan.md)  
**Status:** ✅ Completed  
**Priority:** HIGH

---

## Overview

Register `FolderSyncGateway` and `FolderSyncListener` in `StorageModule`, and add `EventEmitterModule` to `AppModule` to enable WebSocket functionality.

## Current State

- `FolderSyncGateway` exists but not registered
- `FolderSyncListener` exists but not registered
- `EventEmitterModule` not imported in `AppModule`
- WebSocket server never initializes

## Requirements

1. Add `FolderSyncGateway` to `StorageModule` providers
2. Add `FolderSyncListener` to `StorageModule` providers
3. Add `EventEmitterModule` to `AppModule` imports
4. Verify WebSocket server initializes

## Implementation Steps

### Step 1: Update StorageModule

**File:** `apps/api/src/modules/storage/storage.module.ts`

```typescript
import { FolderSyncGateway } from "./gateways/folder-sync.gateway";
import { FolderSyncListener } from "./listeners/folder-sync.listener";

@Module({
  imports: [ConfigModule, UsersModule],
  controllers: [FolderController, DocumentController, StatsController],
  providers: [
    SmbService,
    FolderService,
    FolderSyncService,
    DocumentService,
    VersionService,
    LocalEditService,
    StatsService,
    DocumentSyncHandler,
    FolderSyncHandler,
    SyncDeletionHandler,
    FolderSyncGateway, // ✅ ADD
    FolderSyncListener, // ✅ ADD
  ],
  // ... exports
})
```

### Step 2: Update AppModule

**File:** `apps/api/src/app.module.ts`

```typescript
import { EventEmitterModule } from "@nestjs/event-emitter";

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),

    // Event emitter (required for @OnEvent decorator)
    EventEmitterModule.forRoot(), // ✅ ADD

    // Rate limiting
    ThrottlerModule.forRoot([...]),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    StorageModule,
    DepartmentModule,
    KpiModule,
    MaintenanceModule,
  ],
  controllers: [HealthController],
})
```

### Step 3: Verify Imports

Check that required modules are available:

- `@nestjs/event-emitter` in package.json ✅ (already exists)
- `@nestjs/websockets` in package.json ✅ (already exists)

### Step 4: Test WebSocket Initialization

```bash
cd apps/api
npm run dev
```

**Expected Output:**

- No dependency injection errors
- Server starts successfully
- WebSocket gateway logs connection attempts

## Related Files

- `apps/api/src/modules/storage/storage.module.ts` - To update
- `apps/api/src/app.module.ts` - To update
- `apps/api/src/modules/storage/gateways/folder-sync.gateway.ts` - Gateway exists
- `apps/api/src/modules/storage/listeners/folder-sync.listener.ts` - Listener exists

## Success Criteria

- ✅ No TypeScript compilation errors
- ✅ No dependency injection errors on startup
- ✅ WebSocket gateway initializes (check logs)
- ✅ Server starts without errors
- ✅ Gateway appears in NestJS module tree

## Verification

```bash
# Check for compilation errors
cd apps/api
npm run type-check

# Check server starts
npm run dev
# Should see: "🚀 API running on http://localhost:3010"
# Should NOT see: "Nest can't resolve dependencies"
```
