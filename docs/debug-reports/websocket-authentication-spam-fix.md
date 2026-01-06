# Debug Report: WebSocket Authentication Spam - Continued Issue

**Date:** 2026-01-05  
**Status:** 🔍 Root Cause Identified - Additional Fix Needed  
**Priority:** HIGH

---

## Problem Summary

**Error Pattern:**
```
[Nest] 5108  - 01/05/2026, 1:18:36 PM    WARN [FolderSyncGateway] Client <id> authentication failed
[Nest] 5108  - 01/05/2026, 1:18:36 PM     LOG [FolderSyncGateway] Client <id> disconnected
```

**Frequency:** Hundreds of authentication failures in rapid succession (1:18:36-1:18:41 PM, ~745 attempts)

**Impact:**
- WebSocket connections still failing despite previous fix
- Server logs flooded with authentication warnings
- Socket.IO retrying connections faster than token refresh can complete
- Multiple simultaneous connection attempts

---

## Root Cause Analysis

### Issue 1: Socket.IO Auto-Reconnection Too Aggressive

**Problem:**
- Socket.IO's built-in reconnection mechanism retries **immediately** after disconnect
- Even with `reconnectionAttempts: 5`, it retries very quickly (1 second delay)
- When authentication fails, Socket.IO disconnects and immediately tries to reconnect
- This happens **before** the `connect_error` handler can refresh the token
- Multiple retry attempts happen in parallel, all with expired tokens

**Evidence:**
```typescript
// Current code - Socket.IO retries automatically
const socket = io(`${wsUrl}/storage`, {
  reconnection: true,
  reconnectionDelay: 1000, // Only 1 second delay
  reconnectionAttempts: 5,
  // ❌ Socket.IO retries BEFORE connect_error handler can refresh token
});
```

**Timeline:**
1. Connection attempt with expired token → Authentication fails
2. Socket.IO disconnects → Immediately schedules retry (1 second)
3. `connect_error` handler tries to refresh token (async, takes time)
4. Socket.IO retries with same expired token (before refresh completes)
5. Repeat 745 times...

---

### Issue 2: No Debouncing/Throttling for Token Refresh

**Problem:**
- Multiple connection attempts trigger multiple token refresh calls
- No mechanism to prevent concurrent refresh attempts
- Each failed connection triggers a new refresh attempt
- Can cause race conditions and unnecessary API calls

---

### Issue 3: React Strict Mode Double Mounting (Development)

**Problem:**
- React Strict Mode in development mounts components twice
- This creates **two** WebSocket connections simultaneously
- Both connections fail with expired tokens
- Both trigger reconnection attempts
- Amplifies the spam by 2x

---

## Solution

### Fix 1: Disable Auto-Reconnection, Handle Manually

**Strategy:**
- Disable Socket.IO's automatic reconnection
- Handle reconnection manually after successful token refresh
- Only reconnect when we have a valid token

**Implementation:**
```typescript
const socket = io(`${wsUrl}/storage`, {
  path: "/socket.io",
  auth: { token },
  transports: ["websocket", "polling"],
  reconnection: false, // ✅ Disable auto-reconnection
  timeout: 20000,
});
```

---

### Fix 2: Add Token Refresh Debouncing

**Strategy:**
- Use a ref to track ongoing refresh attempts
- Prevent multiple simultaneous refresh calls
- Queue reconnection attempts during refresh

**Implementation:**
```typescript
const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

async function refreshTokenIfNeeded(): Promise<string | null> {
  // If already refreshing, return the existing promise
  if (refreshPromiseRef.current) {
    return refreshPromiseRef.current;
  }

  // Start refresh
  refreshPromiseRef.current = doRefresh();
  try {
    return await refreshPromiseRef.current;
  } finally {
    refreshPromiseRef.current = null;
  }
}
```

---

### Fix 3: Manual Reconnection After Token Refresh

**Strategy:**
- After successful token refresh, manually reconnect
- Only reconnect if we have a valid token
- Add exponential backoff for failed attempts

**Implementation:**
```typescript
socket.on("connect_error", async (error) => {
  const errorMessage = error.message.toLowerCase();
  if (
    errorMessage.includes("authentication") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("401")
  ) {
    console.warn("WebSocket authentication failed, refreshing token...");
    
    // Disconnect to stop any pending retries
    socket.disconnect();
    
    // Refresh token
    const newToken = await refreshTokenIfNeeded();
    if (newToken) {
      // Update auth and manually reconnect
      socket.auth = { token: newToken };
      socket.connect();
    } else {
      console.error("Token refresh failed, stopping connection attempts");
    }
  }
});
```

---

### Fix 4: Add Connection State Tracking

**Strategy:**
- Track connection state to prevent duplicate connections
- Only attempt connection if not already connecting/connected
- Clean up properly on unmount

**Implementation:**
```typescript
const connectingRef = useRef(false);

const connectWebSocket = async () => {
  // Prevent duplicate connections
  if (connectingRef.current || socketRef.current?.connected) {
    return;
  }

  connectingRef.current = true;
  try {
    // ... connection logic ...
  } finally {
    connectingRef.current = false;
  }
};
```

---

## Implementation Plan

### Phase 1: Disable Auto-Reconnection (Critical)
1. Set `reconnection: false` in Socket.IO config
2. Handle reconnection manually in error handlers

**Time:** 15 minutes  
**Risk:** Low

### Phase 2: Add Token Refresh Debouncing
1. Add `refreshPromiseRef` to prevent concurrent refreshes
2. Update `refreshTokenIfNeeded` to use the ref

**Time:** 15 minutes  
**Risk:** Low

### Phase 3: Manual Reconnection Logic
1. Update `connect_error` handler to manually reconnect
2. Update `disconnect` handler to refresh token before reconnect

**Time:** 20 minutes  
**Risk:** Medium

### Phase 4: Connection State Tracking
1. Add `connectingRef` to prevent duplicate connections
2. Update cleanup logic

**Time:** 10 minutes  
**Risk:** Low

---

## Expected Outcome

After fix:
- ✅ No automatic reconnection with expired tokens
- ✅ Token refresh happens before reconnection
- ✅ Only one connection attempt at a time
- ✅ Clean server logs (no authentication spam)
- ✅ Proper reconnection after successful token refresh

---

## Questions

1. Should we show user notification when WebSocket disconnects?
   - **Recommendation**: Only for persistent failures (> 5 failed attempts)

2. How to handle refresh token expiration?
   - **Recommendation**: Stop reconnecting and show login prompt

3. Should we add exponential backoff for reconnection?
   - **Recommendation**: Yes, for better resilience

