# Debug Report: WebSocket Gateway JWT Dependency Error

**Date:** 2025-12-25  
**Status:** ✅ Fixed  
**Priority:** HIGH

---

## Problem Summary

**Error:**

```
Nest can't resolve dependencies of the FolderSyncGateway (?, ConfigService).
Please make sure that the argument JwtService at index [0] is available in the StorageModule context.
```

**Location:**

- `apps/api/src/modules/storage/gateways/folder-sync.gateway.ts:34`
- `apps/api/src/modules/storage/storage.module.ts`

**Impact:**

- API server fails to start
- WebSocket gateway cannot initialize
- All WebSocket functionality unavailable

---

## Root Cause Analysis

### Issue: Missing JwtService in StorageModule Context

**Problem:**

- `FolderSyncGateway` constructor requires `JwtService` (line 34)
- `StorageModule` does NOT import `AuthModule`
- `JwtService` is provided by `JwtModule` (from `@nestjs/jwt`)
- `AuthModule` exports `JwtModule` (line 36 in `auth.module.ts`)
- Without importing `AuthModule`, `JwtService` is not available in `StorageModule`

**Current State:**

```typescript
// storage.module.ts
@Module({
  imports: [ConfigModule, UsersModule], // ❌ Missing AuthModule
  providers: [
    // ...
    FolderSyncGateway, // Requires JwtService but it's not available
  ],
})

// folder-sync.gateway.ts
constructor(
  private readonly jwtService: JwtService, // ❌ Not available in StorageModule
  private readonly configService: ConfigService
) {}
```

**Where JwtService is Available:**

- `AuthModule` exports `JwtModule` (which provides `JwtService`)
- `JwtModule` is from `@nestjs/jwt` package

---

## Solution

### Option A: Import AuthModule (Recommended)

**Update `apps/api/src/modules/storage/storage.module.ts`:**

```typescript
import { AuthModule } from "@/modules/auth/auth.module";

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    AuthModule, // ✅ ADD THIS - provides JwtService via JwtModule export
  ],
  // ...
})
```

**Why this works:**

- `AuthModule` exports `JwtModule`
- `JwtModule` provides `JwtService`
- Importing `AuthModule` makes `JwtService` available to `StorageModule`

### Option B: Import JwtModule Directly (Alternative)

**Update `apps/api/src/modules/storage/storage.module.ts`:**

```typescript
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_ACCESS_EXPIRES", "15m"),
        },
      }),
      inject: [ConfigService],
    }), // ✅ ADD THIS - provides JwtService directly
  ],
  // ...
})
```

**Why this works:**

- Directly imports `JwtModule` which provides `JwtService`
- No dependency on `AuthModule`
- More explicit but duplicates JWT configuration

**Recommendation:** Use Option A (import `AuthModule`) to avoid duplicating JWT configuration and maintain consistency.

---

## Related Files

- `apps/api/src/modules/storage/storage.module.ts` - Missing AuthModule import
- `apps/api/src/modules/storage/gateways/folder-sync.gateway.ts` - Requires JwtService
- `apps/api/src/modules/auth/auth.module.ts` - Exports JwtModule

---

## Verification

After applying fix:

1. **Check imports:**

   ```typescript
   // storage.module.ts should have:
   imports: [ConfigModule, UsersModule, AuthModule];
   ```

2. **Test server startup:**

   ```bash
   cd apps/api
   npm run dev
   # Should start without dependency injection errors
   # Should show: "🚀 API running on http://localhost:3010"
   ```

3. **Verify WebSocket gateway initializes:**
   - Check logs for gateway initialization
   - No "can't resolve dependencies" errors

---

## Prevention

- Always check module dependencies when adding providers
- Verify required services are available in module context
- Use `AuthModule` export pattern for shared services like `JwtService`
- Document module dependencies in code comments

---

## Notes

- This is a common NestJS dependency injection issue
- `JwtService` must be provided by a module that's imported
- `AuthModule` already exports `JwtModule`, so importing it is the cleanest solution
- Alternative is to duplicate JWT configuration (not recommended)
