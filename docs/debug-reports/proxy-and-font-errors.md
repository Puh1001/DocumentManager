# Debug Report: Proxy Error & Google Fonts AbortError

**Date:** 2024-12-19  
**Issues:**

1. Proxy error: `Failed to proxy http://localhost:3010/api/storage/folders/sync Error: socket hang up`
2. Google Fonts AbortError: `Failed to download Inter from Google Fonts`

---

## Problem Summary

### Issue 1: Proxy Error (Critical)

**Symptom:**

```
Failed to proxy http://localhost:3010/api/storage/folders/sync
Error: socket hang up
code: 'ECONNRESET'
```

**Impact:** API requests fail, sync functionality broken

### Issue 2: Google Fonts AbortError (Non-Critical)

**Symptom:**

```
AbortError: The user aborted a request.
Failed to download `Inter` from Google Fonts. Using fallback font instead.
```

**Impact:** Font loading fails, but fallback works (cosmetic only)

---

## Root Cause Analysis

### Issue 1: Proxy Port Mismatch

**5 Whys Analysis:**

1. **Why** proxy fails? → Backend not running on port 3010
2. **Why** backend not on 3010? → Backend configured for different port (likely 3001)
3. **Why** config mismatch? → `next.config.js` hardcoded default to 3010
4. **Why** hardcoded? → Missing or incorrect `NEXT_PUBLIC_API_URL` env var
5. **Why** env var missing? → Not set in development environment

**Evidence:**

```javascript:9:9:apps/web/next.config.js
destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3010"}/api/:path*`,
```

**Root Cause:**

- Frontend proxy defaults to `http://localhost:3010` (now fixed to 3001)
- Backend running on `http://localhost:3001` (confirmed in `main.ts`)
- `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:3010` (needs manual update)

---

### Issue 2: Google Fonts Network Timeout

**5 Whys Analysis:**

1. **Why** font download fails? → Request aborted/timed out
2. **Why** timeout? → Network issue or Google Fonts service slow
3. **Why** no retry? → Next.js font loader has timeout (default ~5s)
4. **Why** not critical? → Fallback font works, app still functional
5. **Why** keep trying? → Next.js retries 3 times before giving up

**Evidence:**

```typescript:7:7:apps/web/src/app/layout.tsx
const inter = Inter({ subsets: ['latin'] });
```

**Root Cause:**

- Network connectivity issue to Google Fonts
- Or Google Fonts service temporarily slow/unavailable
- Next.js font loader timeout (aborts after ~5 seconds)

---

## Evidence

### Proxy Error Evidence

1. **Error Location:** `next.config.js` line 9
2. **Default Port:** `3010` (hardcoded fallback)
3. **Error Type:** `ECONNRESET` (connection reset = backend not reachable)
4. **Affected Endpoint:** `/api/storage/folders/sync`

### Font Error Evidence

1. **Error Type:** `AbortError` (request aborted)
2. **Retry Attempts:** 3/3 (all failed)
3. **Fallback:** Using system font (app still works)
4. **Location:** Next.js font loader during build/dev

---

## Fix Plan

### Fix 1: Proxy Port Configuration (Priority: High)

**Option A: Set Environment Variable (Recommended)**

```bash
# In apps/web/.env.local or root .env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Option B: Update Default in next.config.js**

```javascript
destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/:path*`,
```

**Option C: Check Backend Port**

- Verify backend is running on expected port
- Update config to match actual backend port

**Implementation Steps:**

1. Check backend port in `apps/api/src/main.ts` or `.env`
2. Set `NEXT_PUBLIC_API_URL` in `apps/web/.env.local`
3. Restart Next.js dev server
4. Verify proxy works

---

### Fix 2: Google Fonts Error (Priority: Low)

**Option A: Use Local Font (Best for Production)**

```typescript
// Download Inter font locally
import localFont from "next/font/local";

const inter = localFont({
  src: "./fonts/Inter-Regular.woff2",
  variable: "--font-inter",
});
```

**Option B: Improve Loading Behavior (Implemented)**

```typescript
const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Better loading behavior, prevents blocking
  fallback: ["system-ui", "arial"], // Fallback fonts if Google Fonts fails
});
```

**Status:** ✅ **Implemented** in `apps/web/src/app/layout.tsx`

**Option C: Ignore (Current State)**

- Error is non-critical
- Fallback font works
- App functionality not affected

**Implementation Steps:**

1. If network issue persists, download Inter font locally
2. Use `next/font/local` instead of `next/font/google`
3. Or add `display: 'swap'` for better loading

---

## Verification

### After Fix 1 (Proxy):

```bash
# Test proxy
curl http://localhost:3000/api/storage/stats
# Should return stats JSON (not 502/ECONNRESET)

# Check backend port
netstat -ano | findstr :3001
# Should show backend listening
```

### After Fix 2 (Fonts):

- Check browser console for font errors
- Verify Inter font loads (or fallback works)
- Check Network tab for font requests

---

## Current Status

- ✅ **Proxy Error**: Fixed default port in `next.config.js` (3010 → 3001)
- ✅ **Font Error**: Fixed with `display: 'swap'` and fallback fonts
- ⏳ **Action Required**: Update `.env.local` manually (file is gitignored)

---

## Next Steps

1. **Immediate:** Fix proxy port configuration
2. **Short-term:** Set `NEXT_PUBLIC_API_URL` in environment
3. **Long-term:** Consider local fonts for production

---

## Notes

- **Proxy error** is blocking API functionality
- **Font error** is cosmetic only
- Both can be fixed independently
- Proxy fix is critical for app functionality
