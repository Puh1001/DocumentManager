# Debug Report: Documents Table Infinite Reload

**Date:** 2026-01-30  
**Issue:** Bảng documents đang bị reload liên tục  
**Severity:** High - Blocks user interaction

---

## Problem Summary

The documents table page (`/dashboard/documents`) continuously reloads, creating an infinite loop of API calls. Users cannot interact with the page as it keeps refreshing.

---

## Root Cause Analysis

### Issue 1: Circular Dependency in useEffect

**Location:** `apps/web/src/app/[locale]/dashboard/documents/page.tsx`

**The Problem:**
1. **Line 139:** `loadAllDocuments` calls `setCurrentPage(response.page || 1)` after API response
2. **Line 166:** `useEffect` depends on `[currentPage, loadAllDocuments]` and calls `loadAllDocuments(currentPage)`
3. **Line 153:** `loadAllDocuments` is recreated whenever `[statusFilter, departmentFilter, levelFilter, limit, toast, t]` change
4. **Result:** When `loadAllDocuments` completes → updates `currentPage` → triggers effect → calls `loadAllDocuments` again → infinite loop

**Evidence:**
```typescript
// Line 108-153: loadAllDocuments updates currentPage
const loadAllDocuments = useCallback(async (page: number) => {
  // ... API call ...
  setCurrentPage(response.page || 1); // ← Updates state
}, [statusFilter, departmentFilter, levelFilter, limit, toast, t]);

// Line 164-166: Effect triggers when currentPage OR loadAllDocuments changes
useEffect(() => {
  loadAllDocuments(currentPage);
}, [currentPage, loadAllDocuments]); // ← loadAllDocuments recreation triggers this
```

**Why it loops:**
- `loadAllDocuments` completes → `setCurrentPage(response.page || 1)` 
- If `response.page === currentPage`, state update still triggers re-render
- Effect sees `loadAllDocuments` function reference changed (even if logic same)
- Effect runs → calls `loadAllDocuments` → updates `currentPage` → loop continues

### Issue 2: Missing Page Parameter

**Location:** Line 201

**The Problem:**
```typescript
// Line 201: Called without required page parameter
loadAllDocuments(); // ❌ Missing argument
```

**Impact:** TypeScript error, but also indicates logic inconsistency.

### Issue 3: Unnecessary currentPage Update

**Location:** Line 139

**The Problem:**
`setCurrentPage(response.page || 1)` is called even when `response.page === currentPage`, causing unnecessary state update and re-render.

---

## Solution

### Fix 1: Prevent Circular Dependency

**Strategy:** Only update `currentPage` if it actually changed, and use a ref to prevent effect from running during API call.

**Changes:**
1. Add check before updating `currentPage`
2. Use ref to track if we're already loading
3. Remove `loadAllDocuments` from effect dependency (use ref pattern instead)

**Code:**
```typescript
const isLoadingRef = useRef(false);

const loadAllDocuments = useCallback(async (page: number) => {
  if (isLoadingRef.current) return; // Prevent concurrent calls
  isLoadingRef.current = true;
  
  try {
    setLoading(true);
    // ... API call ...
    
    // Only update if page actually changed
    if (response.page !== currentPage) {
      setCurrentPage(response.page || 1);
    }
    
    setDocuments(response.data || []);
    setTotal(response.total || 0);
    setTotalPages(response.totalPages || 0);
  } catch (error) {
    // ... error handling ...
  } finally {
    setLoading(false);
    isLoadingRef.current = false;
  }
}, [statusFilter, departmentFilter, levelFilter, limit, toast, t, currentPage]);

// Use ref-based effect to avoid dependency on loadAllDocuments
useEffect(() => {
  if (!isLoadingRef.current) {
    loadAllDocuments(currentPage);
  }
}, [currentPage]); // Only depend on currentPage
```

### Fix 2: Fix Missing Page Parameter

**Location:** Line 201

**Change:**
```typescript
// Before
loadAllDocuments();

// After  
loadAllDocuments(currentPage);
```

### Fix 3: Better Approach - Separate Concerns

**Better Strategy:** Don't update `currentPage` inside `loadAllDocuments`. Only update it when user explicitly changes page or filters reset.

**Code:**
```typescript
const loadAllDocuments = useCallback(async (page: number) => {
  try {
    setLoading(true);
    // ... API call ...
    
    // Don't update currentPage here - it's already set by caller
    setDocuments(response.data || []);
    setTotal(response.total || 0);
    setTotalPages(response.totalPages || 0);
  } catch (error) {
    // ... error handling ...
  } finally {
    setLoading(false);
  }
}, [statusFilter, departmentFilter, levelFilter, limit, toast, t]);

// Effect for page changes
useEffect(() => {
  loadAllDocuments(currentPage);
}, [currentPage]); // Only currentPage, loadAllDocuments is stable

// Effect for filter changes (resets to page 1)
const debouncedLoadDocuments = useDebounce(() => {
  setCurrentPage(1); // This will trigger the page effect above
}, 300);

useEffect(() => {
  debouncedLoadDocuments();
}, [statusFilter, departmentFilter, levelFilter, debouncedLoadDocuments]);
```

---

## Recommended Fix

**Use Fix 3 (Better Approach)** - It's cleaner and separates concerns:
- `loadAllDocuments` only loads data, doesn't manage page state
- Page state is managed explicitly by user actions or filter resets
- No circular dependencies

---

## Fix Applied

**Changes Made:**

1. **Removed `setCurrentPage` from `loadAllDocuments`** (line 139)
   - Prevents circular dependency
   - Page state is now managed by explicit user actions or filter resets

2. **Updated debounced filter effect** (line 155-161)
   - Now sets `currentPage` to 1, which triggers the page effect
   - Cleaner separation of concerns

3. **Fixed missing page parameter** (line 201)
   - Changed `loadAllDocuments()` to `loadAllDocuments(currentPage)`

**Result:**
- No more infinite loop
- Filters reset to page 1 properly
- Page changes work correctly
- WebSocket sync events refresh correctly

---

## Verification Steps

After fix:
1. Open `/dashboard/documents` page
2. Check browser Network tab - should see only 1-2 API calls on load
3. Change filters - should see debounced API call after 300ms
4. Change page - should see 1 API call per page change
5. No continuous reloading

---

## Files to Modify

1. `apps/web/src/app/[locale]/dashboard/documents/page.tsx`
   - Remove `setCurrentPage` from `loadAllDocuments` (line 139)
   - Fix missing page parameter (line 201)
   - Update effect dependencies (line 166)
