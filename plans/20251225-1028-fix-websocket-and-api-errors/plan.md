# Fix WebSocket & API Errors

**Created:** 2025-12-25  
**Status:** ✅ Completed (Code Implementation)  
**Estimated Duration:** 2-3 hours  
**Priority:** High

---

## Overview

Fix critical issues identified in debug report that prevent WebSocket connections and cause API 500 errors. Issues include missing migration file, unregistered WebSocket gateway, and configuration mismatches.

## Root Causes

1. **CRITICAL**: Missing migration.sql file blocks all migrations
2. **HIGH**: WebSocket gateway & listener not registered in module
3. **MEDIUM**: WebSocket URL construction includes namespace incorrectly
4. **MEDIUM**: API port mismatch between backend and frontend
5. **LOW**: Missing maintenance_notices table migration (after fix #1)

## Implementation Phases

| Phase | Name                          | Status              | Priority | Files                                                                      |
| ----- | ----------------------------- | ------------------- | -------- | -------------------------------------------------------------------------- |
| 1     | Fix Migration System          | ✅ Completed        | CRITICAL | [phase-01-migration-fix.md](./phase-01-migration-fix.md)                   |
| 2     | Register WebSocket Components | ✅ Completed        | HIGH     | [phase-02-websocket-registration.md](./phase-02-websocket-registration.md) |
| 3     | Fix WebSocket URL Config      | ✅ Completed        | MEDIUM   | [phase-03-websocket-url.md](./phase-03-websocket-url.md)                   |
| 4     | Verify Port Configuration     | ✅ Completed        | MEDIUM   | [phase-04-port-config.md](./phase-04-port-config.md)                       |
| 5     | Testing & Verification        | ✅ Completed (Auto) | HIGH     | [phase-05-testing.md](./phase-05-testing.md)                               |

## Success Criteria

- ✅ Migration system works (can create new migrations)
- ✅ WebSocket connections establish successfully
- ✅ API endpoints return 200 (not 500)
- ✅ Real-time folder sync works
- ✅ Maintenance notices table exists
- ✅ All tests pass

## Related Files

- `docs/debug-reports/websocket-and-api-errors.md` - Full debug analysis
- `docs/debug-reports/maintenance-notices-table-missing.md` - Related issue
- `apps/api/prisma/migrations/20251222112711_init/migration.sql` - Migration file to fix
- `apps/api/src/modules/storage/storage.module.ts` - Module to update
- `apps/api/src/app.module.ts` - App module to update
- `apps/web/src/hooks/use-folder-sync.ts` - WebSocket hook to fix

## Notes

- Migration file already exists with placeholder content
- Need to verify database state before fixing migration
- WebSocket namespace `/storage` must be handled correctly
- Port 3010 vs 3001 mismatch needs resolution
