# Phase 5: Testing & Verification

**Parent Plan:** [plan.md](./plan.md)  
**Status:** ✅ Completed (Automated Tests)  
**Priority:** HIGH

---

## Overview

Comprehensive testing and verification of all fixes. Ensure migration system works, WebSocket connects, API endpoints respond correctly, and real-time sync functions.

## Requirements

1. Verify migration system works
2. Test WebSocket connections
3. Test API endpoints
4. Test real-time folder sync
5. Verify maintenance notices work
6. Run automated tests

## Test Cases

### Test 1: Migration System

**Steps:**

```bash
cd apps/api

# 1. Check migration status
npx prisma migrate status
# Expected: "Database schema is up to date"

# 2. Verify maintenance_notices table exists
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM maintenance_notices;"
# Expected: Returns count (0 if empty)

# 3. Try creating new migration (test)
npx prisma migrate dev --name test_migration --create-only
# Expected: Creates migration file without errors
# Then delete: rm -rf prisma/migrations/*test_migration*
```

**Success Criteria:**

- ✅ Migration status shows "up to date"
- ✅ Can create new migrations
- ✅ `maintenance_notices` table exists

### Test 2: WebSocket Connection

**Steps:**

1. Start API server: `cd apps/api && npm run dev`
2. Start frontend: `cd apps/web && npm run dev`
3. Open browser to `http://localhost:3000`
4. Login to application
5. Open browser console (F12)
6. Navigate to documents/folders page

**Expected:**

- Console shows: "Connecting to WebSocket: ws://localhost:3010"
- Console shows: "WebSocket connected"
- Network tab shows WS connection with status 101
- No connection errors

**Success Criteria:**

- ✅ WebSocket connects successfully
- ✅ No connection errors in console
- ✅ Network tab shows active WS connection

### Test 3: API Endpoints

**Steps:**

```bash
# Get auth token first (login via frontend or API)
TOKEN="your-jwt-token"

# Test health endpoint
curl http://localhost:3010/api/health
# Expected: {"status":"ok"}

# Test folders tree endpoint
curl http://localhost:3010/api/storage/folders/tree \
  -H "Authorization: Bearer $TOKEN"
# Expected: JSON array of folders (200 OK)

# Test maintenance endpoint
curl http://localhost:3010/api/maintenance \
  -H "Authorization: Bearer $TOKEN"
# Expected: JSON array of maintenance notices (200 OK, not 500)
```

**Success Criteria:**

- ✅ Health endpoint returns 200
- ✅ Folders tree returns 200 (not 500)
- ✅ Maintenance endpoint returns 200 (not 500)
- ✅ All endpoints return valid JSON

### Test 4: Real-time Folder Sync

**Steps:**

1. Open application in browser
2. Navigate to documents/folders page
3. Open browser console
4. Add a file to SMB share (or trigger sync)
5. Watch console for sync events

**Expected:**

- Console shows: "Sync event received: {type: 'document_added', ...}"
- UI updates automatically
- No errors

**Success Criteria:**

- ✅ Sync events received in browser
- ✅ UI updates automatically
- ✅ No errors in console

### Test 5: Maintenance Notices

**Steps:**

1. Login as admin/manager
2. Navigate to maintenance page
3. Create a maintenance notice
4. Verify it appears in list
5. Edit the notice
6. Delete the notice

**Success Criteria:**

- ✅ Can create maintenance notice
- ✅ Notice appears in list
- ✅ Can edit notice
- ✅ Can delete notice
- ✅ No database errors

### Test 6: Automated Tests

**Steps:**

```bash
# Run API tests
cd apps/api
npm test

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run frontend tests (if any)
cd apps/web
npm test
```

**Success Criteria:**

- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ No linting errors

## Verification Checklist

- [ ] Migration system works
- [ ] WebSocket connects successfully
- [ ] API endpoints return 200 (not 500)
- [ ] Real-time sync works
- [ ] Maintenance notices CRUD works
- [ ] All tests pass
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No linting errors

## Regression Testing

Verify existing functionality still works:

- [ ] User authentication
- [ ] Document viewing
- [ ] Folder navigation
- [ ] KPI dashboard
- [ ] Department management

## Performance Checks

- [ ] WebSocket connection establishes quickly (< 2s)
- [ ] API endpoints respond quickly (< 500ms)
- [ ] No memory leaks (check over time)
- [ ] No excessive reconnection attempts

## Related Files

- `apps/api/src/modules/storage/storage.integration.spec.ts` - Integration tests
- `apps/api/jest.config.js` - Test configuration
- `apps/web/src/hooks/use-folder-sync.ts` - WebSocket hook

## Success Criteria

- ✅ All test cases pass
- ✅ No errors in console
- ✅ All API endpoints work
- ✅ WebSocket connections stable
- ✅ Real-time sync functional
- ✅ Maintenance notices work
- ✅ No regressions

## Troubleshooting

**If WebSocket still fails:**

1. Check browser console for errors
2. Check API logs for gateway initialization
3. Verify namespace configuration
4. Check CORS settings

**If API returns 500:**

1. Check API logs for errors
2. Verify database connection
3. Check Prisma client is generated
4. Verify all tables exist

**If migrations fail:**

1. Check database connection
2. Verify migration file exists
3. Check migration status
4. Review Prisma logs
