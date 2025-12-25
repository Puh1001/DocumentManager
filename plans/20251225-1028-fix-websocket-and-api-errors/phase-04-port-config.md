# Phase 4: Verify Port Configuration

**Parent Plan:** [plan.md](./plan.md)  
**Status:** ✅ Completed  
**Priority:** MEDIUM

---

## Overview

Ensure API port configuration is consistent between backend and frontend. Default is 3001, but frontend expects 3010.

## Current State

- Backend default: `3001` (from `main.ts`)
- Frontend config: `3010` (from `.env.local`)
- Mismatch causes connection failures if `API_PORT` not set

## Requirements

1. Verify backend port configuration
2. Verify frontend port configuration
3. Ensure consistency
4. Document port configuration

## Implementation Steps

### Step 1: Check Backend Configuration

**File:** `apps/api/.env` or `apps/api/.env.local`

```env
API_PORT=3010
```

**File:** `apps/api/src/main.ts`

```typescript
const port = configService.get("API_PORT", 3001); // Default 3001
```

**Action:**

- If `.env` has `API_PORT=3010` → ✅ OK
- If not set → Add `API_PORT=3010` to `.env`

### Step 2: Check Frontend Configuration

**File:** `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3010
NEXT_PUBLIC_WS_URL=http://localhost:3010
```

**Action:**

- Verify both point to `3010`
- If pointing to `3001`, update to `3010` OR update backend to use `3001`

### Step 3: Choose Port Strategy

**Option A: Use 3010 (Recommended)**

- Backend: Set `API_PORT=3010` in `.env`
- Frontend: Keep `3010` in `.env.local`
- ✅ Consistent

**Option B: Use 3001**

- Backend: Remove `API_PORT` from `.env` (use default)
- Frontend: Update to `3001` in `.env.local`
- ✅ Consistent

**Recommendation:** Use Option A (3010) to match current frontend config.

### Step 4: Verify Port on Startup

```bash
cd apps/api
npm run dev
```

**Expected Output:**

```
🚀 API running on http://localhost:3010
📚 Swagger docs on http://localhost:3010/api/docs
```

If shows `3001` → `API_PORT` env var not loaded.

### Step 5: Test Connection

```bash
# Test API endpoint
curl http://localhost:3010/api/health

# Should return: {"status":"ok"}
```

## Related Files

- `apps/api/.env` or `apps/api/.env.local` - Backend port config
- `apps/api/src/main.ts` - Port default value
- `apps/web/.env.local` - Frontend port config
- `docs/quick-start.md` - Documentation to update

## Success Criteria

- ✅ Backend runs on port 3010
- ✅ Frontend connects to port 3010
- ✅ API health check succeeds
- ✅ WebSocket connects to port 3010
- ✅ No connection errors

## Verification

1. **Check Backend Logs:**

   ```bash
   # Should show: "🚀 API running on http://localhost:3010"
   ```

2. **Test API:**

   ```bash
   curl http://localhost:3010/api/health
   ```

3. **Test Frontend:**
   - Open browser console
   - Check API requests go to `localhost:3010`
   - Check WebSocket connects to `localhost:3010`

## Documentation Update

Update `docs/quick-start.md` to document port configuration:

```markdown
## Port Configuration

- **API Port**: Default `3001`, configurable via `API_PORT` env var
- **Frontend Port**: Default `3000` (Next.js)
- **Recommended**: Set `API_PORT=3010` in `apps/api/.env` to match frontend config
```

## Notes

- Port mismatch is common source of connection errors
- Always verify port in startup logs
- Use environment variables for port configuration
- Document port requirements in README
