# Debug Report: WebSocket Authentication Failed Loop

**Date:** 2026-01-05  
**Status:** 🔍 Root Cause Identified  
**Priority:** HIGH

---

## Problem Summary

**Error Pattern:**
```
[Nest] 50772  - 01/05/2026, 12:25:07 PM    WARN [FolderSyncGateway] Client <id> authentication failed
[Nest] 50772  - 01/05/2026, 12:25:07 PM     LOG [FolderSyncGateway] Client <id> disconnected
```

**Frequency:** Hundreds of authentication failures in rapid succession (all at 12:25:07-12:25:09 PM)

**Impact:**
- WebSocket connections fail immediately after connection attempt
- Real-time folder sync not working
- Infinite reconnection loop with expired tokens
- Server logs flooded with authentication warnings

---

## Root Cause Analysis

### Issue 1: Expired JWT Tokens in WebSocket Connections

**Problem:**
- JWT access tokens expire after **15 minutes** (default `JWT_ACCESS_EXPIRES`)
- `useFolderSync` hook reads token from `localStorage` **without checking expiration**
- When token expires, WebSocket authentication fails
- Hook has `reconnectionAttempts: Infinity`, causing infinite reconnection loop with expired token

**Location:**
- `apps/web/src/hooks/use-folder-sync.ts:95` - Gets token from localStorage without expiration check
- `apps/api/src/modules/storage/gateways/folder-sync.gateway.ts:52-60` - JWT verification fails for expired tokens

**Evidence:**
```typescript
// use-folder-sync.ts:95
const token = localStorage.getItem("accessToken");
if (!token) {
  console.warn("No access token found, skipping WebSocket connection");
  return;
}
// ❌ No expiration check before using token
```

```typescript
// folder-sync.gateway.ts:52-60
const payload = await this.jwtService.verifyAsync(token, {
  secret: this.configService.get<string>("JWT_SECRET"),
});
// ❌ Throws error if token expired, causing authentication failure
```

---

### Issue 2: No Token Refresh Mechanism for WebSocket

**Problem:**
- `ApiClient` has token refresh mechanism for HTTP requests
- WebSocket hook **does NOT use ApiClient** - reads directly from localStorage
- No automatic token refresh before WebSocket connection
- No token refresh during reconnection attempts

**Location:**
- `apps/web/src/hooks/use-folder-sync.ts` - Independent token handling
- `apps/web/src/lib/api.ts` - Has `refreshTokenIfNeeded()` but WebSocket doesn't use it

**Evidence:**
```typescript
// api.ts has refresh mechanism
private async refreshTokenIfNeeded(): Promise<void> { ... }
private async ensureValidToken(): Promise<string | null> { ... }

// use-folder-sync.ts does NOT use api.ts
const token = localStorage.getItem("accessToken"); // Direct access
```

---

### Issue 3: Infinite Reconnection Loop

**Problem:**
- `reconnectionAttempts: Infinity` keeps trying to reconnect
- Each reconnection uses the same expired token
- No backoff or token refresh between attempts
- Creates hundreds of failed connection attempts

**Location:**
- `apps/web/src/hooks/use-folder-sync.ts:123` - `reconnectionAttempts: Infinity`

**Evidence:**
```typescript
const socket = io(`${wsUrl}/storage`, {
  // ...
  reconnection: true,
  reconnectionAttempts: Infinity, // ❌ Keeps trying with expired token
  // ...
});
```

---

## Solution

### Fix 1: Add Token Expiration Check and Refresh

**Update `apps/web/src/hooks/use-folder-sync.ts`:**

1. **Add token expiration check utility:**
```typescript
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // Treat invalid tokens as expired
  }
}
```

2. **Add token refresh before connection:**
```typescript
async function refreshTokenIfNeeded(): Promise<string | null> {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  // Check if token is expired or expires soon (within 1 minute)
  if (isTokenExpired(token)) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      console.warn("No refresh token available");
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        return data.accessToken;
      }
    } catch (error) {
      console.error("Failed to refresh token:", error);
    }
  }

  return token;
}
```

3. **Use refreshed token in connection:**
```typescript
// Get and refresh token if needed
const token = await refreshTokenIfNeeded();
if (!token) {
  console.warn("No valid access token available, skipping WebSocket connection");
  return;
}
```

---

### Fix 2: Add Reconnection Backoff with Token Refresh

**Update reconnection logic:**

1. **Add token refresh on reconnection:**
```typescript
socket.on("disconnect", async (reason) => {
  console.log("WebSocket disconnected:", reason);
  
  if (reason === "io server disconnect") {
    // Server disconnected, refresh token and reconnect
    const newToken = await refreshTokenIfNeeded();
    if (newToken) {
      socket.auth = { token: newToken };
      socket.connect();
    }
  }
});
```

2. **Handle authentication errors:**
```typescript
socket.on("connect_error", async (error) => {
  console.error("WebSocket connection error:", error.message);
  
  // If authentication failed, try refreshing token
  if (error.message.includes("authentication") || error.message.includes("401")) {
    const newToken = await refreshTokenIfNeeded();
    if (newToken) {
      socket.auth = { token: newToken };
      // Socket.IO will automatically retry with new token
    } else {
      // Stop reconnecting if refresh fails
      socket.disconnect();
    }
  }
});
```

---

### Fix 3: Limit Reconnection Attempts

**Update connection options:**

```typescript
const socket = io(`${wsUrl}/storage`, {
  path: "/socket.io",
  auth: { token },
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000, // Max 10 seconds between attempts
  reconnectionAttempts: 5, // Limit to 5 attempts instead of Infinity
  timeout: 20000,
});
```

---

## Implementation Plan

### Phase 1: Add Token Utilities (Quick Fix)
1. Add `isTokenExpired()` function
2. Add `refreshTokenIfNeeded()` function
3. Use refreshed token in connection

**Time:** 30 minutes  
**Risk:** Low

### Phase 2: Improve Reconnection Logic
1. Add token refresh on disconnect
2. Handle authentication errors
3. Limit reconnection attempts

**Time:** 30 minutes  
**Risk:** Medium

### Phase 3: Testing
1. Test with expired token
2. Test token refresh flow
3. Test reconnection behavior

**Time:** 30 minutes  
**Risk:** Low

---

## Expected Outcome

After fix:
- ✅ WebSocket checks token expiration before connecting
- ✅ Automatically refreshes expired tokens
- ✅ Reconnects with fresh token after disconnect
- ✅ Limits reconnection attempts to prevent infinite loops
- ✅ Clean server logs (no authentication spam)

---

## Questions

1. Should we refresh proactively (before expiration) or reactively (on failure)?
   - **Recommendation**: Hybrid - check expiration before connection, refresh if expired or expires soon

2. How to handle refresh token expiration?
   - **Recommendation**: Stop reconnecting and show user message to re-login

3. Should we show user notification when WebSocket disconnects?
   - **Recommendation**: Only for persistent failures, not for temporary reconnections

