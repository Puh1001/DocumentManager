# Debug Report: KPI Data Loss After Input

**Date:** 2025-01-06  
**Issue:** Nhập thông tin xong rồi. Sau một thời gian quay lại bị mất dữ liệu  
**Severity:** High  
**Status:** 🔍 Root Cause Identified

---

## Problem Summary

Users report that after entering KPI data, when they return to the page later, their input data is missing. The data appears to be lost even though they entered it correctly.

## Root Cause Analysis (5 Whys)

1. **Why is data lost?**  
   → Data is only stored in React component state (`records`), not persisted to backend until user clicks "Save" button.

2. **Why isn't it persisted automatically?**  
   → No auto-save functionality implemented. Data is only saved when user explicitly clicks the "Save" button (`handleSave` function).

3. **Why does data disappear when user returns?**  
   → When user navigates away and comes back, or changes department/year, the `useEffect` hook at line 166 reloads data from API, which overwrites the local state with server data (that doesn't have unsaved changes).

4. **Why isn't there a warning when leaving with unsaved changes?**  
   → No `beforeunload` or `visibilitychange` event handlers implemented to detect and warn about unsaved changes.

5. **Why isn't there local storage backup?**  
   → No local storage persistence implemented to backup unsaved changes.

## Evidence

### Code Analysis

**File:** `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

1. **Data Loading (Line 166-332):**

```166:332:apps/web/src/app/[locale]/dashboard/kpi/page.tsx
  useEffect(() => {
    const loadRecords = async () => {
      if (!selectedDepartmentId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const list = await api.get<KpiRecord[]>(
          `/kpi/records?departmentId=${selectedDepartmentId}&year=${selectedYear}`
        );
        // ... processes and sets records
        setRecords(recordsWithMetrics);
      } catch (err: unknown) {
        // ... error handling
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [
    selectedDepartmentId,
    selectedYear,
    toast,
    canCreate,
    hasAttemptedAutoCreate,
  ]);
```

**Problem:** This `useEffect` runs whenever `selectedDepartmentId` or `selectedYear` changes, reloading data from API and overwriting any unsaved local changes.

2. **Save Function (Line 619-675):**

```619:675:apps/web/src/app/[locale]/dashboard/kpi/page.tsx
  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const record of records) {
        try {
          await api.patch(`/kpi/records/${record.id}`, {
            title: record.title,
            target: record.target,
            targetValue: record.targetValue,
          });
        } catch (err: unknown) {
          // ... error handling
        }

        for (const metric of record.metrics) {
          try {
            await api.patch(`/kpi/metrics/${metric.id}`, {
              name: metric.name,
              type: metric.type,
              sortOrder: metric.sortOrder,
              values: JSON.stringify(metric.values || {}),
            });
          } catch (err: unknown) {
            // ... error handling
          }
        }
      }
      toast({
        title: "Thành công",
        description: "Đã lưu thay đổi",
        variant: "success",
      });
    } catch (err: unknown) {
      // ... error handling
    } finally {
      setIsSaving(false);
      setIsEditMode(false);
    }
  };
```

**Observation:** This is the ONLY function that persists data to backend. No auto-save mechanism exists.

3. **No Unsaved Changes Detection:**
   - No `beforeunload` event handler
   - No `visibilitychange` event handler
   - No tracking of "dirty" state (hasUnsavedChanges)

4. **No Local Storage Backup:**
   - No localStorage persistence for unsaved changes
   - No recovery mechanism for lost data

### User Scenarios That Cause Data Loss

1. **User enters data → Changes department/year → Data lost**  
   Changing `selectedDepartmentId` or `selectedYear` triggers `useEffect` which reloads from API, losing unsaved changes.

2. **User enters data → Navigates away → Returns → Data lost**  
   Page reload fetches fresh data from API, which doesn't have unsaved changes.

3. **User enters data → Browser refresh → Data lost**  
   Component remounts, `useEffect` runs, loads from API (no unsaved changes).

4. **User enters data → Closes tab → Reopens → Data lost**  
   Same as scenario 2.

## Fix Plan

### Option 1: Auto-Save with Debouncing (Recommended)

**Implementation:**

1. Add debounced auto-save function that saves changes after user stops typing (e.g., 2-3 seconds)
2. Track "dirty" state to know when there are unsaved changes
3. Show visual indicator when auto-saving
4. Handle save errors gracefully

**Pros:**

- Best user experience - no manual save needed
- Prevents data loss automatically
- Industry standard approach

**Cons:**

- More API calls (mitigated by debouncing)
- More complex implementation

### Option 2: Unsaved Changes Warning

**Implementation:**

1. Track "dirty" state (hasUnsavedChanges)
2. Add `beforeunload` event handler to warn when leaving with unsaved changes
3. Warn when changing department/year with unsaved changes
4. Optionally add local storage backup for recovery

**Pros:**

- Simpler implementation
- User maintains control
- Prevents accidental data loss

**Cons:**

- User must remember to save
- Less user-friendly than auto-save

### Option 3: Hybrid Approach (Best)

**Implementation:**

1. Implement auto-save with debouncing (Option 1)
2. Add unsaved changes warning as backup (Option 2)
3. Add local storage backup for recovery
4. Show save status indicator

**Pros:**

- Best of both worlds
- Maximum data protection
- Excellent UX

**Cons:**

- Most complex implementation

## Recommended Solution: Option 3 (Hybrid)

### Implementation Steps

1. **Add dirty state tracking:**
   - Track when `records` state changes from initial loaded state
   - Create `hasUnsavedChanges` state

2. **Implement debounced auto-save:**
   - Use `useDebouncedCallback` or similar
   - Auto-save after 2-3 seconds of inactivity
   - Show "Saving..." indicator during auto-save

3. **Add unsaved changes warning:**
   - `beforeunload` event handler
   - Warning when changing department/year with unsaved changes
   - Confirm dialog before proceeding

4. **Add local storage backup:**
   - Save unsaved changes to localStorage on change
   - Restore on page load if data exists
   - Clear after successful save

5. **Visual indicators:**
   - Show "Unsaved changes" badge when dirty
   - Show "Saving..." during auto-save
   - Show "Saved" confirmation after save

### Code Changes Required

**Files to modify:**

- `apps/web/src/app/[locale]/dashboard/kpi/page.tsx` - Main implementation

**New dependencies (if needed):**

- `use-debounce` or similar for debouncing
- Or implement custom debounce hook

**Estimated effort:**

- 4-6 hours for full implementation
- 2-3 hours for basic auto-save only

## Testing Checklist

- [ ] Enter data, wait for auto-save, verify data persists
- [ ] Enter data, change department, verify warning appears
- [ ] Enter data, refresh page, verify local storage recovery
- [ ] Enter data, close tab, reopen, verify local storage recovery
- [ ] Test with slow network (verify auto-save doesn't interfere)
- [ ] Test with multiple users editing simultaneously
- [ ] Verify save status indicators work correctly
- [ ] Test error handling when auto-save fails

## Related Issues

- Similar pattern may exist in other forms/pages
- Consider creating reusable `useAutoSave` hook for other pages

## Notes

- Backend API already supports PATCH operations correctly
- No backend changes needed
- This is purely a frontend UX/data persistence issue
