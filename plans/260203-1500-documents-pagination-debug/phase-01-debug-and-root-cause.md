# Phase 1: Debug & Root Cause Analysis

**Date:** 2026-02-03  
**Priority:** High  
**Status:** 🔄 Pending

---

## Goal

Reproduce the pagination bug, capture evidence, and identify root cause(s) for:

1. Slow page 2 loading
2. UI showing page 1 after page 2 loads
3. Potential backend over-fetching

---

## Prerequisites

- [ ] Local dev environment running (frontend + backend + database)
- [ ] At least 80+ documents in database (or seed script to create test data)
- [ ] Browser DevTools ready (Network tab, Performance tab)
- [ ] Backend logs accessible

---

## Debugging Steps

### Step 1: Reproduce Issue Locally

**TODO:**

- [ ] Navigate to `/dashboard/documents` (page 1)
- [ ] Verify page 1 loads correctly
- [ ] Click pagination to go to page 2
- [ ] Observe loading time (use browser DevTools Performance tab)
- [ ] Observe UI state after load completes
- [ ] Take screenshots/video if possible

**Expected Issues:**

- Page 2 takes > 5 seconds to load
- UI shows "Page 1" even though page 2 data is displayed
- Or UI shows "Page 2" but displays page 1 data

---

### Step 2: Capture API Requests/Responses

**TODO:**

- [ ] Open browser DevTools → Network tab
- [ ] Clear network log
- [ ] Navigate to page 1, capture request:
  - URL: `/storage/documents?page=1&limit=20&status=ACTIVE`
  - Request headers
  - Response time
  - Response body (check `data`, `total`, `page`, `limit`, `totalPages`)
- [ ] Click to page 2, capture request:
  - URL: `/storage/documents?page=2&limit=20&status=ACTIVE`
  - Request headers
  - Response time
  - Response body (check `data`, `total`, `page`, `limit`, `totalPages`)
- [ ] Compare both responses:
  - Verify `page` field in response matches request
  - Verify `data` array length (should be ≤ 20)
  - Verify `total` is consistent
  - Verify `totalPages` calculation is correct

**Key Checks:**

- [ ] Does backend return `page: 2` in response when requesting page 2?
- [ ] Does `data` array contain correct items for page 2?
- [ ] Is response time significantly slower for page 2?
- [ ] Are there duplicate documents in response?

---

### Step 3: Analyze Backend Query Execution

**TODO:**

- [ ] Add temporary logging to `DocumentService.findAll()`:
  ```typescript
  console.log("[DEBUG] findAll called with:", { page, limit, skip, filters });
  console.log("[DEBUG] Prisma query where:", JSON.stringify(where, null, 2));
  ```
- [ ] Add logging after Prisma query:
  ```typescript
  console.log("[DEBUG] Prisma returned:", documents.length, "documents");
  console.log("[DEBUG] Total count:", total);
  ```
- [ ] Add logging after deduplication:
  ```typescript
  console.log("[DEBUG] After deduplication:", deduped.length, "documents");
  ```
- [ ] Trigger page 1 and page 2 requests
- [ ] Review backend logs:
  - [ ] Verify `skip` value is correct (page 1: 0, page 2: 20)
  - [ ] Verify Prisma query uses `skip` and `take` correctly
  - [ ] Check if deduplication reduces item count significantly
  - [ ] Measure time between query start and response

**Key Checks:**

- [ ] Is Prisma query using `skip`/`take` correctly?
- [ ] How many documents does Prisma return before deduplication?
- [ ] How many documents remain after deduplication?
- [ ] Is deduplication causing page 2 to have fewer items than expected?

---

### Step 4: Check Frontend State Management

**TODO:**

- [ ] Add temporary logging to `loadAllDocuments()`:
  ```typescript
  console.log("[DEBUG] loadAllDocuments called with page:", page);
  console.log("[DEBUG] Response received:", {
    page: response.page,
    total: response.total,
    dataLength: response.data?.length,
  });
  ```
- [ ] Add logging to `useEffect` that handles page changes:
  ```typescript
  console.log("[DEBUG] useEffect triggered, currentPage:", currentPage);
  ```
- [ ] Add logging after state updates:
  ```typescript
  console.log("[DEBUG] State updated:", {
    currentPage,
    total,
    totalPages,
    documentsLength: documents.length,
  });
  ```
- [ ] Navigate to page 2 and observe console logs
- [ ] Verify state update sequence:
  - [ ] `currentPage` is set to 2 when clicking pagination
  - [ ] `loadAllDocuments(2)` is called
  - [ ] Response contains correct page 2 data
  - [ ] State updates correctly (`total`, `totalPages`, `documents`)
  - [ ] `currentPage` remains 2 (not reset to 1)

**Key Checks:**

- [ ] Is `currentPage` being reset unexpectedly?
- [ ] Is there a race condition between state updates?
- [ ] Does `loadAllDocuments` dependency array cause re-renders?

---

### Step 5: Performance Analysis

**TODO:**

- [ ] Use browser Performance tab to profile page 2 load:
  - [ ] Record performance timeline
  - [ ] Identify long tasks (> 50ms)
  - [ ] Check for unnecessary re-renders
- [ ] Check backend query performance:
  - [ ] Add `EXPLAIN ANALYZE` to Prisma query (if possible)
  - [ ] Check database indexes on `Document` table
  - [ ] Verify indexes exist on: `status`, `folderId`, `levelId`, `updatedAt`
- [ ] Measure network transfer:
  - [ ] Check response payload size
  - [ ] Verify no unnecessary data in response
  - [ ] Check if response includes all relations (folder, department, etc.)

**Key Checks:**

- [ ] Is the slowness in database query, network transfer, or frontend rendering?
- [ ] Are database indexes optimal?
- [ ] Is response payload too large?

---

## Root Cause Hypotheses

Based on code review, likely causes:

### Hypothesis 1: Deduplication After Pagination

**Issue:** Backend deduplicates AFTER fetching paginated results, causing:

- Page 2 might have fewer items than `limit` (e.g., 15 instead of 20)
- `total` count includes duplicates, making pagination inconsistent
- Frontend might show wrong page number if deduplication reduces items

**Evidence Needed:**

- Compare `documents.length` before/after deduplication
- Check if page 2 response has fewer than 20 items
- Verify if `total` count matches actual unique documents

### Hypothesis 2: Frontend State Race Condition

**Issue:** `currentPage` state might be reset by filter changes or other effects

**Evidence Needed:**

- Check if `debouncedLoadDocuments` resets page to 1 unexpectedly
- Verify `useEffect` dependencies don't cause unwanted re-renders
- Check if WebSocket sync events reset pagination

### Hypothesis 3: Backend Over-fetching

**Issue:** Backend might be fetching all documents then filtering (though code shows proper pagination)

**Evidence Needed:**

- Verify Prisma query actually uses `skip`/`take`
- Check database query logs for actual SQL executed
- Measure query execution time vs. total documents

---

## Deliverables

After completing debugging:

1. **Debug Report** (`debug-report.md`):
   - Screenshots/videos of issue
   - Network request/response logs
   - Backend console logs
   - Performance profiling results
   - Root cause conclusion

2. **Evidence Files:**
   - API response samples (page 1 vs page 2)
   - Backend log excerpts
   - Performance timeline screenshots

---

## Acceptance Criteria

- [ ] Issue reproduced locally
- [ ] All API requests/responses captured
- [ ] Backend query execution analyzed
- [ ] Frontend state management traced
- [ ] Performance bottlenecks identified
- [ ] Root cause(s) clearly identified with evidence
- [ ] Debug report created with findings

---

**Next:** `phase-02-api-and-ui-fix.md` (after root cause confirmed)
