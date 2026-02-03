# Documents Pagination Performance & Logic Bug Fix

**Date:** 2026-02-03  
**Priority:** High  
**Status:** 🔄 Planning

---

## Problem Summary

User reports slow loading and incorrect pagination state on `/dashboard/documents` page 2:
- Page 2 loads very slowly
- After loading completes, UI still shows page 1
- Suspected backend over-fetching (loading all documents then filtering in memory)
- Overall performance feels poor

---

## Root Cause Analysis (Initial)

**Backend Issue:**
- `DocumentService.findAll()` applies pagination correctly (`skip`/`take`)
- BUT deduplication happens AFTER pagination (lines 193-206)
- Deduplication can reduce items per page, causing inconsistent pagination
- `total` count calculated before deduplication, may be inaccurate

**Frontend Issue:**
- `currentPage` state managed correctly
- Comment says "Don't update currentPage here" (line 166) - may indicate state sync issue
- Need to verify API response handling and state updates

---

## Goals

1. Fix backend pagination: ensure deduplication doesn't break pagination
2. Fix frontend state: ensure UI reflects correct page after load
3. Improve performance: verify no over-fetching, optimize queries
4. Add tests: verify pagination correctness with 80+ documents

---

## Implementation Phases

### Phase 1: Debug & Root Cause
- Reproduce issue locally
- Capture API requests/responses
- Analyze backend query execution
- Identify exact cause of slow loading & state mismatch

### Phase 2: Backend & Frontend Fix
- Fix backend deduplication/pagination logic
- Fix frontend state management
- Add performance optimizations if needed
- Update tests

---

## Success Criteria

- ✅ Page 2 loads quickly (< 2s with 80+ documents)
- ✅ UI correctly shows page 2 after load completes
- ✅ Pagination works correctly across all pages
- ✅ No over-fetching (verify with network tab)
- ✅ All existing tests pass
- ✅ Performance acceptable with large datasets

---

## Files to Investigate/Modify

**Backend:**
- `apps/api/src/modules/storage/services/document.service.ts` (findAll method)
- `apps/api/src/modules/storage/controllers/document.controller.ts`
- `apps/api/src/modules/storage/dto/query-documents.dto.ts`

**Frontend:**
- `apps/web/src/app/[locale]/dashboard/documents/page.tsx`
- `apps/web/src/components/documents/document-list.tsx`

**Tests:**
- `apps/api/src/modules/storage/services/document.service.spec.ts`
- `apps/api/src/modules/storage/controllers/document.controller.spec.ts`

---

**Next:** See `phase-01-debug-and-root-cause.md`
