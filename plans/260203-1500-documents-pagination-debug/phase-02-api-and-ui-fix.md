# Phase 2: Backend & Frontend Fix

**Date:** 2026-02-03  
**Priority:** High  
**Status:** 🔄 Pending

---

## Goal

Fix identified root causes:

1. Backend pagination/deduplication logic
2. Frontend state management
3. Performance optimizations

**Note:** This phase assumes Phase 1 root cause analysis is complete. Adjust steps based on actual findings.

---

## Prerequisites

- [ ] Phase 1 debug report reviewed
- [ ] Root cause(s) confirmed
- [ ] Test data prepared (80+ documents)
- [ ] Local dev environment ready

---

## Implementation Steps

### Step 1: Fix Backend Deduplication Logic

**Problem:** Deduplication happens AFTER pagination, causing inconsistent page sizes.

**Solution Options:**

#### Option A: Move Deduplication to Database Level (Preferred)

Use Prisma `distinct` or GROUP BY to deduplicate at query level.

**TODO:**

- [ ] Research Prisma deduplication options:
  - [ ] Can we use `distinct` on `folderId` + `fileName`?
  - [ ] Or use raw SQL with `DISTINCT ON` (PostgreSQL)?
- [ ] If possible, modify Prisma query to deduplicate before pagination
- [ ] Update `total` count query to match deduplication logic
- [ ] Test with duplicate documents

**File:** `apps/api/src/modules/storage/services/document.service.ts`

**Code Location:** Lines 145-214 (findAll method)

---

#### Option B: Deduplicate Before Pagination (Fallback)

Fetch all matching documents, deduplicate, then paginate in memory.

**⚠️ Warning:** This defeats pagination purpose if dataset is large. Only use if Option A impossible.

**TODO:**

- [ ] Fetch all matching documents (without pagination)
- [ ] Apply deduplication
- [ ] Calculate `total` from deduplicated array
- [ ] Apply pagination (`slice`) to deduplicated array
- [ ] Return paginated result

**Trade-offs:**

- ✅ Consistent pagination
- ❌ Loads all documents into memory (performance issue with large datasets)
- ❌ Not scalable

---

#### Option C: Fix Deduplication to Preserve Pagination (Recommended)

Keep pagination at DB level, but fix `total` count to exclude duplicates.

**TODO:**

- [ ] Keep Prisma query with `skip`/`take` (pagination at DB level)
- [ ] Apply deduplication to fetched page only
- [ ] Fix `total` count: query unique `(folderId, fileName)` combinations
  ```typescript
  // Count unique (folderId, fileName) combinations
  const uniqueCount = await this.prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(DISTINCT CONCAT("folderId", ':', "fileName")) as count
    FROM "Document"
    WHERE ... -- same where conditions
  `;
  ```
- [ ] Use `uniqueCount` for `total` instead of `document.count()`
- [ ] Recalculate `totalPages` based on deduplicated `total`

**File:** `apps/api/src/modules/storage/services/document.service.ts`

**Expected Changes:**

```typescript
// Around line 145-180
const [documents, uniqueTotal] = await Promise.all([
  this.prisma.document.findMany({ /* ... with skip/take */ }),
  // Count unique (folderId, fileName) combinations
  this.prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(DISTINCT CONCAT("folderId", ':', "fileName")) as count
    FROM "Document"
    WHERE ... -- same where conditions as findMany
  `,
]);

const total = Number(uniqueTotal[0].count);
// Apply deduplication to fetched page
const deduped = /* ... existing deduplication logic ... */;
```

---

### Step 2: Fix Frontend State Management

**Problem:** UI shows wrong page number after load completes.

**TODO:**

- [ ] Review `loadAllDocuments` function (line 126-184)
- [ ] Verify `currentPage` is NOT updated inside `loadAllDocuments` (comment says "Don't update currentPage here")
- [ ] Check if response `page` field matches request:
  - [ ] If backend returns wrong `page`, log warning
  - [ ] If backend returns correct `page`, verify frontend uses it
- [ ] Fix state update sequence:
  ```typescript
  // After receiving response
  setDocuments(response.data);
  setTotal(response.total);
  setTotalPages(response.totalPages);
  // Verify currentPage matches response.page
  if (currentPage !== response.page) {
    console.warn("Page mismatch:", {
      currentPage,
      responsePage: response.page,
    });
    // Optionally: setCurrentPage(response.page) if backend is source of truth
  }
  ```
- [ ] Check for race conditions:
  - [ ] Verify `debouncedLoadDocuments` doesn't reset page unexpectedly
  - [ ] Verify WebSocket sync events don't reset pagination
  - [ ] Check `useEffect` dependencies don't cause unwanted resets

**File:** `apps/web/src/app/[locale]/dashboard/documents/page.tsx`

**Key Areas:**

- Lines 126-184: `loadAllDocuments` function
- Lines 192-200: Filter change effect (resets to page 1)
- Lines 198-200: Page change effect
- Lines 203-246: WebSocket sync handler

---

### Step 3: Performance Optimizations

**TODO:**

- [ ] Verify database indexes exist:
  ```sql
  -- Check indexes on Document table
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'Document';
  ```
- [ ] Add missing indexes if needed:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_document_status ON "Document"("status");
  CREATE INDEX IF NOT EXISTS idx_document_folder_id ON "Document"("folderId");
  CREATE INDEX IF NOT EXISTS idx_document_level_id ON "Document"("levelId");
  CREATE INDEX IF NOT EXISTS idx_document_updated_at ON "Document"("updatedAt");
  ```
- [ ] Optimize Prisma query includes:
  - [ ] Review if all relations are needed (folder, department, preparer, reviewer, approver, level)
  - [ ] Consider using `select` instead of `include` to reduce payload
  - [ ] Check if `_count.versions` is necessary for list view
- [ ] Add query result caching if appropriate (Redis, or in-memory cache)
- [ ] Measure improvement:
  - [ ] Before: page 2 load time
  - [ ] After: page 2 load time
  - [ ] Target: < 2 seconds with 80+ documents

**Files:**

- `apps/api/src/modules/storage/services/document.service.ts`
- Database migration (if indexes added)

---

### Step 4: Update Tests

**TODO:**

- [ ] Update `document.service.spec.ts`:
  - [ ] Test pagination with duplicate documents
  - [ ] Verify deduplication doesn't break pagination
  - [ ] Verify `total` count matches unique documents
  - [ ] Test page 2 returns correct items
- [ ] Update `document.controller.spec.ts`:
  - [ ] Test pagination query params
  - [ ] Verify response format matches frontend expectations
- [ ] Add integration test:
  - [ ] Create 100+ documents (some duplicates)
  - [ ] Request page 1, verify 20 items
  - [ ] Request page 2, verify 20 items (or correct count)
  - [ ] Verify `total` matches unique document count
  - [ ] Verify `totalPages` calculation is correct

**Files:**

- `apps/api/src/modules/storage/services/document.service.spec.ts`
- `apps/api/src/modules/storage/controllers/document.controller.spec.ts`

---

### Step 5: Frontend Testing & Validation

**TODO:**

- [ ] Manual testing:
  - [ ] Navigate to page 1, verify correct data
  - [ ] Click to page 2, verify:
    - [ ] Loading indicator shows
    - [ ] Page loads within 2 seconds
    - [ ] UI shows "Page 2" after load
    - [ ] Correct documents displayed (items 21-40)
    - [ ] Pagination controls work correctly
  - [ ] Test with filters (status, department, level):
    - [ ] Apply filter, verify pagination resets to page 1
    - [ ] Navigate to page 2 with filter, verify correct data
  - [ ] Test edge cases:
    - [ ] Last page (might have fewer items)
    - [ ] Empty result set
    - [ ] Single page (no pagination needed)
- [ ] Browser DevTools verification:
  - [ ] Network tab: verify API calls use correct `page` param
  - [ ] Network tab: verify response time < 2s
  - [ ] Console: verify no errors/warnings
  - [ ] React DevTools: verify state updates correctly

---

## Implementation Notes

### Backend Deduplication Strategy

**Current Logic (lines 193-206):**

- Deduplicates by `(folderId, fileName)` key
- Keeps document with latest `updatedAt`
- Sorts by `name` after deduplication

**Issue:** This happens AFTER pagination, so:

- Page 1 might have 20 items before dedup, 18 after
- Page 2 might have 20 items before dedup, 15 after
- `total` count (line 180) includes duplicates, so pagination math is wrong

**Fix:** Use Option C (recommended) - fix `total` count to exclude duplicates while keeping DB-level pagination.

---

### Frontend State Management

**Current Flow:**

1. User clicks page 2 → `setCurrentPage(2)`
2. `useEffect` detects `currentPage` change → calls `loadAllDocuments(2)`
3. `loadAllDocuments` sends API request with `page=2`
4. Response received → updates `documents`, `total`, `totalPages`
5. Comment says "Don't update currentPage here" (line 166)

**Potential Issue:**

- If `loadAllDocuments` is called with page 2, but response has wrong `page` field, UI might show wrong page
- Or if another effect resets `currentPage` to 1 after load completes

**Fix:** Verify backend returns correct `page` in response, and ensure no other effects reset `currentPage` unexpectedly.

---

## Rollback Plan

If fixes cause issues:

1. **Backend:** Revert `document.service.ts` changes, keep deduplication after pagination
2. **Frontend:** Revert state management changes
3. **Database:** Drop indexes if they cause write performance issues

---

## Acceptance Criteria

- [ ] Backend pagination works correctly with duplicates
- [ ] `total` count matches unique documents
- [ ] Page 2 loads in < 2 seconds (with 80+ documents)
- [ ] UI correctly shows page 2 after load completes
- [ ] All existing tests pass
- [ ] New tests added for pagination with duplicates
- [ ] Manual testing confirms fix works
- [ ] No performance regressions

---

**Next:** After implementation, create completion report
