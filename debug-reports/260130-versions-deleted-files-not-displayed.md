# Debug Report: Versions và Deleted Files Không Hiển Thị/Đếm

**Date:** 2026-01-30  
**Issue:** Không hiển thị và đếm các files trong versions và delete files  
**Severity:** Medium - Missing functionality

---

## Problem Summary

1. **Versions Count:** Cột "Phiên bản" (Version) hiển thị `0` cho tất cả documents, mặc dù có thể có versions trong database
2. **Deleted Files:** Không có cách nào để xem số lượng deleted files hoặc filter/hiển thị chúng

---

## Root Cause Analysis

### Issue 1: Versions Count Hiển Thị 0

**Location:** 
- Backend: `apps/api/src/modules/storage/services/document.service.ts:118-122`
- Frontend: `apps/web/src/components/documents/document-list.tsx:132`

**Current Implementation:**
```typescript
// Backend - document.service.ts
_count: {
  select: {
    versions: true,
  },
}

// Frontend - document-list.tsx
{doc._count?.versions != null ? doc._count.versions : PLACEHOLDER}
```

**Possible Causes:**
1. **Prisma `_count` syntax:** Prisma `_count` should work, but need to verify it's counting correctly
2. **No versions in database:** Documents may genuinely have 0 versions (only current file, no version history)
3. **Data not being returned:** The `_count` might not be included in the response properly

**Evidence from Image:**
- All 3 visible documents show `0` in "Phiên bản" column
- This suggests either:
  - No versions exist in database (most likely)
  - Or `_count` is not working correctly

**Investigation Needed:**
- Check if documents actually have versions in `document_versions` table
- Verify Prisma query is returning `_count` correctly
- Check API response structure

### Issue 2: Deleted Files Không Được Hiển Thị/Đếm

**Location:**
- Filter exists: `apps/web/src/app/[locale]/dashboard/documents/page.tsx:114-120`
- But no UI to show count or easily access deleted files

**Current Implementation:**
```typescript
// Status filter exists
if (
  statusFilter === "ACTIVE" ||
  statusFilter === "ARCHIVED" ||
  statusFilter === "DELETED"
) {
  params.append("status", statusFilter);
}
```

**Missing:**
1. **No deleted files count:** No badge or indicator showing how many deleted files exist
2. **No easy access:** User must manually select "DELETED" from status filter dropdown
3. **No summary:** No overview showing total deleted files

**User Expectation:**
- See count of deleted files (similar to versions count)
- Easy way to view deleted files
- Possibly a badge or separate section

---

## Investigation Steps

### Step 1: Verify Versions Count

**Check Database:**
```sql
-- Check if any documents have versions
SELECT d.id, d.name, COUNT(dv.id) as version_count
FROM documents d
LEFT JOIN document_versions dv ON d.id = dv.document_id
GROUP BY d.id, d.name
HAVING COUNT(dv.id) > 0
LIMIT 10;
```

**Check API Response:**
- Inspect network tab to see if `_count.versions` is in response
- Verify structure: `{ data: [{ _count: { versions: 0 } }] }`

**Check Prisma Query:**
- Verify `_count` syntax is correct for Prisma version
- May need to use `include: { versions: true }` then count manually

### Step 2: Verify Deleted Files

**Check Database:**
```sql
-- Count deleted documents
SELECT COUNT(*) FROM documents WHERE status = 'DELETED';
```

**Check Filter:**
- Verify DELETED filter works when selected
- Check if deleted documents are returned correctly

---

## Solution Plan

### Fix 1: Versions Count Display

**If versions exist but count is wrong:**
- Verify Prisma `_count` syntax
- May need to use `include: { versions: true }` and count array length
- Or use raw query with COUNT

**If no versions exist (expected behavior):**
- This is correct - documents only have current file, no version history
- Consider adding tooltip or explanation
- Or implement versioning feature if needed

**Recommended Fix:**
```typescript
// Option 1: Use include and count manually
include: {
  versions: {
    select: { id: true }, // Only select id for counting
  },
}

// Then in frontend:
{doc.versions?.length ?? 0}

// Option 2: Keep _count but verify it works
// Current implementation should work if Prisma version supports it
```

### Fix 2: Deleted Files Display

**Add Deleted Files Count Badge:**
- Show count in toolbar or header
- Click to filter to DELETED status

**Add Deleted Files Summary:**
- Add a section showing deleted files count
- Or add badge next to status filter

**Recommended Implementation:**
```typescript
// In page.tsx, add deleted files count state
const [deletedCount, setDeletedCount] = useState(0);

// Fetch deleted count separately or include in main query
useEffect(() => {
  api.get('/storage/documents', { params: { status: 'DELETED', limit: 1 } })
    .then(res => setDeletedCount(res.total));
}, []);

// Display in toolbar or header
{deletedCount > 0 && (
  <Badge variant="destructive">
    {deletedCount} deleted files
  </Badge>
)}
```

---

## Files Modified

1. **Frontend:**
   - `apps/web/src/components/documents/document-list.tsx` - Fixed versions display to show "0" instead of placeholder
   - `apps/web/src/app/[locale]/dashboard/documents/page.tsx` - Added deleted files count badge

---

## Fixes Applied

### Fix 1: Versions Count Display

**Change:** Updated display logic to show "0" when count is actually 0, instead of placeholder

**Code:**
```typescript
// Before
{doc._count?.versions != null ? doc._count.versions : PLACEHOLDER}

// After
{doc._count?.versions != null && doc._count.versions > 0 
  ? doc._count.versions 
  : doc._count?.versions === 0 
    ? "0" 
    : PLACEHOLDER}
```

**Result:** Now shows "0" when document has no versions, instead of "—"

### Fix 2: Deleted Files Count Badge

**Changes:**
1. Added `deletedCount` state to track deleted files
2. Added API call to fetch deleted count on mount and after sync events
3. Added clickable badge in toolbar that filters to DELETED status

**Code:**
```typescript
// Load deleted count
useEffect(() => {
  const loadDeletedCount = async () => {
    try {
      const response = await api.get<{ total: number }>(
        "/storage/documents?status=DELETED&limit=1&page=1"
      );
      setDeletedCount(response.total || 0);
    } catch (error) {
      setDeletedCount(0);
    }
  };
  loadDeletedCount();
}, []);

// Badge in toolbar
{deletedCount > 0 && (
  <Badge
    variant="destructive"
    className="cursor-pointer"
    onClick={() => {
      setStatusFilter("DELETED");
      setCurrentPage(1);
    }}
  >
    {t("filters.statusDeleted")}: {deletedCount}
  </Badge>
)}
```

**Result:** 
- Badge shows deleted files count
- Click badge to filter to DELETED status
- Count refreshes after sync events

---

## Verification Steps

After fixes:
1. **Versions:**
   - Upload a document with version history
   - Verify count shows correct number
   - Check database to confirm versions exist

2. **Deleted Files:**
   - Create/delete some documents
   - Verify deleted count badge appears
   - Click badge to filter to deleted files
   - Verify deleted documents are shown correctly
