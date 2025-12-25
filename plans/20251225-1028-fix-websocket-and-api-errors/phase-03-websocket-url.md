# Phase 3: Fix WebSocket URL Configuration

**Parent Plan:** [plan.md](./plan.md)  
**Status:** ✅ Completed  
**Priority:** MEDIUM

---

## Overview

Fix WebSocket URL construction in frontend hook. Currently includes namespace `/storage` in URL, but Socket.IO client should connect to base URL and handle namespace separately.

## Current State

- `getWebSocketUrl()` returns: `"ws://localhost:3010/storage"`
- Socket.IO client tries: `"ws://localhost:3010/socket.io/?EIO=4&transport=websocket"`
- Gateway namespace: `/storage`
- Connection fails because namespace is in wrong place

## Requirements

1. Update `getWebSocketUrl()` to return base URL only
2. Update Socket.IO connection to use namespace correctly
3. Verify WebSocket connection succeeds

## Implementation Steps

### Step 1: Update getWebSocketUrl Function

**File:** `apps/web/src/hooks/use-folder-sync.ts`

**Current:**

```typescript
function getWebSocketUrl(): string | null {
  // ...
  if (explicitWs) {
    return explicitWs.replace(/[/:]+$/, "") + "/storage"; // ❌ Wrong
  }
  // ...
  return `${wsUrl}/storage`; // ❌ Wrong
}
```

**Fixed:**

```typescript
function getWebSocketUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Get base URL (without namespace)
  const explicitWs = process.env.NEXT_PUBLIC_WS_URL;
  if (explicitWs) {
    // Return base URL only, namespace handled by socket.io client
    return explicitWs.replace(/[/:]+$/, ""); // ✅ Base URL only
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    const normalized = apiUrl.replace(/[/:]+$/, "");
    return normalized.replace(/^http/, "ws"); // ✅ Base URL only
  }

  return null;
}
```

### Step 2: Update Socket.IO Connection

**File:** `apps/web/src/hooks/use-folder-sync.ts`

**Current:**

```typescript
const socket = io(wsUrl, {
  // wsUrl = "ws://localhost:3010/storage"
  auth: { token },
  transports: ["websocket", "polling"],
  // ...
});
```

**Fixed:**

```typescript
// Get base URL (without namespace)
const wsUrl = getWebSocketUrl(); // Returns: "ws://localhost:3010"

if (!wsUrl) {
  console.warn("WebSocket URL is not configured; realtime sync disabled");
  return;
}

// Connect to base URL with explicit path and namespace
const socket = io(wsUrl, {
  path: "/socket.io", // ✅ Explicit Socket.IO path
  auth: { token },
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  timeout: 20000,
});

// Connect to namespace after socket is created
socket.on("connect", () => {
  console.log("WebSocket connected");
  // Namespace is handled by gateway configuration (/storage)
  // Client connects to base, server routes to namespace
  subscribeToFolder(socket, folderIdRef.current);
});
```

**Alternative (if namespace needs explicit connection):**

```typescript
// If namespace must be explicit in connection:
const socket = io(`${wsUrl}/storage`, {
  // Connect directly to namespace
  path: "/socket.io",
  auth: { token },
  // ...
});
```

### Step 3: Verify Environment Variables

**File:** `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3010
NEXT_PUBLIC_WS_URL=http://localhost:3010
```

Ensure both point to same base URL (without `/storage` suffix).

## Related Files

- `apps/web/src/hooks/use-folder-sync.ts` - To update
- `apps/web/.env.local` - Environment variables
- `apps/api/src/modules/storage/gateways/folder-sync.gateway.ts` - Gateway namespace config

## Success Criteria

- ✅ `getWebSocketUrl()` returns base URL only
- ✅ Socket.IO connects to correct URL
- ✅ Browser console shows "WebSocket connected" (not errors)
- ✅ Network tab shows successful WS connection
- ✅ Real-time sync events work

## Verification

1. **Check Browser Console:**
   - Should see: "Connecting to WebSocket: ws://localhost:3010"
   - Should see: "WebSocket connected"
   - Should NOT see: "WebSocket connection error"

2. **Check Network Tab:**
   - WS connection to `ws://localhost:3010/socket.io/`
   - Status: 101 Switching Protocols
   - No 404 or connection errors

3. **Test Real-time Sync:**
   - Add/remove file in SMB share
   - Should see sync event in browser console
   - UI should update automatically

## Notes

- Socket.IO automatically handles `/socket.io/` path
- Namespace `/storage` is configured on server side
- Client connects to base URL, server routes to namespace
- If explicit namespace connection needed, use `${wsUrl}/storage`
