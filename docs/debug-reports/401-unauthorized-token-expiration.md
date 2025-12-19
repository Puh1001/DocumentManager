# Architecture Analysis: 401 Unauthorized After Browser Refresh

**Date:** 2024-12-19  
**Issue:** API returns 401 Unauthorized when calling `/api/storage/stats` after browser refresh, even though user appears logged in.

---

## Architecture Analysis

### Problem Understanding

**Symptom:**

- User refreshes browser → Still appears logged in (UI shows user)
- API call to `/api/storage/stats` → Returns `401 Unauthorized`
- Error: `Failed to load resource: the server responded with a status of 401 (Unauthorized)`

**Root Cause:**
Access token has **expired** (default: 15 minutes) but frontend:

1. ✅ Restores token from `localStorage` on mount
2. ✅ Sets user state (UI shows logged in)
3. ❌ **Does NOT verify token expiration**
4. ❌ **Does NOT automatically refresh expired tokens**
5. ❌ **Does NOT intercept 401 responses to refresh token**

---

## Expert Consultation

### 1. Systems Designer Perspective

**System Boundaries:**

```
Frontend (Next.js)          Backend (NestJS)
├─ AuthProvider            ├─ JwtAuthGuard
├─ ApiClient               ├─ JwtStrategy
└─ localStorage            └─ JWT Validation
```

**Interface Issues:**

- **Frontend → Backend**: Sends expired token without validation
- **Backend → Frontend**: Returns 401 but frontend doesn't handle gracefully
- **Missing**: Automatic token refresh interceptor

**Component Interactions:**

1. `AuthProvider` restores token from localStorage (no expiration check)
2. `ApiClient` sends token in Authorization header (no validation)
3. `JwtAuthGuard` validates token → **Rejects expired token**
4. Frontend receives 401 → **No automatic recovery**

---

### 2. Technology Strategist Perspective

**Current Stack:**

- **JWT Access Token**: 15 minutes expiration (default)
- **JWT Refresh Token**: 7 days expiration
- **Storage**: localStorage (persists across refreshes)
- **Validation**: Backend-only (Passport JWT strategy)

**Technology Gaps:**

1. **No client-side token expiration check**
   - Should decode JWT and check `exp` claim
   - Should refresh proactively before expiration

2. **No automatic token refresh on 401**
   - Should intercept 401 responses
   - Should call `/api/auth/refresh`
   - Should retry original request

3. **No request queue during refresh**
   - Multiple concurrent requests → Multiple refresh attempts
   - Should queue requests during refresh

**Best Practices (2025):**

- ✅ Short access token expiration (15m) - **Implemented**
- ✅ Long refresh token expiration (7d) - **Implemented**
- ❌ Automatic token refresh - **Missing**
- ❌ Request retry after refresh - **Missing**
- ❌ Token expiration validation - **Missing**

---

### 3. Scalability Consultant Perspective

**Performance Impact:**

- **Current**: Every expired token → 401 → User must manually refresh
- **Proposed**: Automatic refresh → Seamless user experience

**Reliability:**

- **Current**: Single point of failure (expired token = broken app)
- **Proposed**: Automatic recovery → Higher uptime

**Growth Considerations:**

- As app scales, more concurrent requests → Need request queue
- Multiple tabs → Need shared token refresh mechanism (BroadcastChannel)

---

### 4. Risk Analyst Perspective

**Security Risks:**

- ✅ Short token expiration (15m) - **Good**
- ✅ Refresh token rotation - **Implemented**
- ⚠️ Token in localStorage - **Acceptable for web app**
- ❌ No token expiration check - **Low risk, high UX impact**

**User Experience Risks:**

- **High**: User appears logged in but API calls fail
- **High**: No clear error message about expired session
- **Medium**: Manual refresh required

**Technical Debt:**

- Missing automatic token refresh → User frustration
- No request retry mechanism → Broken workflows

---

## Design Recommendations

### Solution 1: Automatic Token Refresh Interceptor (Recommended)

**Architecture:**

```
ApiClient.request()
  ├─ Check token expiration (client-side)
  ├─ If expired → Refresh token
  ├─ Send request with token
  ├─ If 401 → Refresh token → Retry request
  └─ Return response
```

**Implementation:**

1. **Token Expiration Check**

   ```typescript
   private isTokenExpired(token: string): boolean {
     try {
       const payload = JSON.parse(atob(token.split('.')[1]));
       return payload.exp * 1000 < Date.now();
     } catch {
       return true;
     }
   }
   ```

2. **401 Interceptor**

   ```typescript
   async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
     // ... existing code ...

     if (response.status === 401) {
       // Try to refresh token
       await this.refreshTokenIfNeeded();
       // Retry original request
       return this.request<T>(endpoint, options);
     }
   }
   ```

3. **Request Queue**

   ```typescript
   private refreshPromise: Promise<void> | null = null;

   private async refreshTokenIfNeeded(): Promise<void> {
     if (this.refreshPromise) {
       return this.refreshPromise; // Wait for ongoing refresh
     }

     this.refreshPromise = this.doRefresh();
     await this.refreshPromise;
     this.refreshPromise = null;
   }
   ```

**Pros:**

- ✅ Seamless user experience
- ✅ Automatic recovery
- ✅ No code changes in components

**Cons:**

- ⚠️ Requires refresh token to be valid
- ⚠️ Need to handle refresh failures

---

### Solution 2: Proactive Token Refresh

**Architecture:**

- Check token expiration before each request
- Refresh proactively if token expires soon (e.g., within 1 minute)

**Implementation:**

```typescript
private async ensureValidToken(): Promise<string | null> {
  const token = this.getToken();
  if (!token) return null;

  // Check if token expires soon
  if (this.isTokenExpiringSoon(token)) {
    await this.refreshTokenIfNeeded();
    return this.getToken();
  }

  return token;
}
```

**Pros:**

- ✅ Prevents 401 errors
- ✅ Better UX (no failed requests)

**Cons:**

- ⚠️ More refresh calls (if not cached)
- ⚠️ Still need 401 interceptor as fallback

---

### Solution 3: Hybrid Approach (Best)

**Combine:**

1. **Proactive refresh** - If token expires soon
2. **401 interceptor** - Fallback for edge cases
3. **Request queue** - Prevent concurrent refreshes

---

## Technology Guidance

### Frontend Changes

**File: `apps/web/src/lib/api.ts`**

- Add `isTokenExpired()` method
- Add `isTokenExpiringSoon()` method
- Add `refreshTokenIfNeeded()` method
- Add request queue mechanism
- Intercept 401 responses
- Retry requests after refresh

**File: `apps/web/src/lib/auth-context.tsx`**

- Expose `refreshToken` function to ApiClient
- Or: Move refresh logic to ApiClient

### Backend Changes

**No changes needed** - Backend already handles:

- ✅ Token validation
- ✅ Refresh token endpoint
- ✅ Proper 401 responses

---

## Implementation Strategy

### Phase 1: Token Expiration Check (Quick Win)

1. Add `isTokenExpired()` to ApiClient
2. Check before sending requests
3. Refresh if expired

**Time:** 30 minutes  
**Risk:** Low

### Phase 2: 401 Interceptor (Core Fix)

1. Intercept 401 responses
2. Refresh token automatically
3. Retry original request

**Time:** 1 hour  
**Risk:** Medium (need to handle edge cases)

### Phase 3: Request Queue (Polish)

1. Queue requests during refresh
2. Prevent concurrent refresh calls
3. Handle refresh failures gracefully

**Time:** 30 minutes  
**Risk:** Low

### Phase 4: Proactive Refresh (Enhancement)

1. Check if token expires soon
2. Refresh proactively
3. Reduce 401 errors

**Time:** 30 minutes  
**Risk:** Low

---

## Next Actions

### Immediate (Fix 401 Error)

1. ✅ **Implement 401 interceptor** in `ApiClient`
2. ✅ **Add automatic token refresh** on 401
3. ✅ **Retry request** after refresh

### Short-term (Improve UX)

1. ✅ **Add token expiration check** before requests
2. ✅ **Proactive refresh** if token expires soon
3. ✅ **Request queue** to prevent concurrent refreshes

### Long-term (Enhance Security)

1. ⚠️ Consider moving tokens to httpOnly cookies (CSRF protection)
2. ⚠️ Implement token rotation on refresh
3. ⚠️ Add refresh token expiration handling

---

## Summary

**Root Cause:** Access token expires (15m) but frontend doesn't refresh automatically.

**Solution:** Implement automatic token refresh interceptor in `ApiClient` that:

1. Intercepts 401 responses
2. Refreshes token using refresh token
3. Retries original request
4. Queues concurrent requests during refresh

**Impact:**

- ✅ Fixes 401 errors after browser refresh
- ✅ Seamless user experience
- ✅ No manual intervention required

**Effort:** ~2 hours for complete solution

---

## Questions

1. Should we refresh proactively (before expiration) or reactively (on 401)?
   - **Recommendation**: Hybrid - proactive if expires soon, reactive as fallback

2. How to handle refresh token expiration?
   - **Recommendation**: Redirect to login page

3. Should we show loading state during refresh?
   - **Recommendation**: Yes, for better UX
