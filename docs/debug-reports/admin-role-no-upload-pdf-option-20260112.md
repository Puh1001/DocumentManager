# Debug Report: Admin Role Missing PDF Upload Option

**Date:** 2026-01-12  
**Status:** 🔍 Root Cause Analysis  
**Priority:** HIGH

---

## Problem Summary

**Issue:** Admin role cannot see upload PDF option in KPI page, even though admin should have full access.

**Symptom:**

- KPI page shows "No attachments" section
- Upload PDF button/option is not visible for admin user
- Component `KpiAttachmentUpload` returns `null` when `canCreate` is false

**Expected Behavior:**

- Admin role should have full access (`manage:all`)
- Upload PDF option should be visible for admin users
- Admin should be able to upload PDF attachments

**Actual Behavior:**

- Upload component checks `useCanAccess("create", "Kpi")` and returns `null` if false
- Admin user cannot see upload option

---

## Root Cause Analysis (5 Whys)

### Why 1: Why is upload option not visible for admin?

**Answer:** Component `KpiAttachmentUpload` checks `useCanAccess("create", "Kpi")` and returns `null` if permission check fails.

**Evidence from code:**

```typescript
// apps/web/src/components/boss/kpi-attachment-upload.tsx:28-32
const canCreate = useCanAccess("create", "Kpi");

if (!canCreate) {
  return null;
}
```

### Why 2: Why does `useCanAccess("create", "Kpi")` return false for admin?

**Answer:** `useCanAccess` hook only checks `ability.can("create", "Kpi")` but doesn't check `manage:all` or `manage:Kpi` permissions.

**Evidence from code:**

```typescript
// apps/web/src/hooks/use-can-access.ts:12-19
export function useCanAccess(action: Actions, subject: Subjects): boolean {
  const { ability, loading } = useAbility();

  if (loading || !ability) {
    return false;
  }

  return ability.can(action, subject); // ❌ Only checks specific action, not manage:all
}
```

### Why 3: Why doesn't CASL's `manage:all` automatically allow `create:Kpi`?

**Answer:** CASL's `manage` action should allow all actions, but the check needs to be explicit. The hook doesn't check for `manage:all` or `manage:subject` before checking the specific action.

**Evidence from backend:**

```typescript
// apps/api/src/modules/authorization/factories/casl-ability.factory.ts:42-45
// Admin has full access
if (userRoles.includes("admin")) {
  can("manage", "all");
  return build();
}
```

**Evidence from backend guard (correct implementation):**

```typescript
// apps/api/src/modules/authorization/guards/policies.guard.ts:68-71
// Check manage:all first (admin has full access)
if (ability.can("manage", "all")) {
  return true;
}
```

### Why 4: Why is frontend hook different from backend guard?

**Answer:** Frontend `useCanAccess` hook was implemented without checking `manage:all` or `manage:subject`, while backend `PoliciesGuard` correctly checks these first.

**Evidence:**

- Backend guard checks `manage:all` first (line 69)
- Backend guard also checks `manage:subject` as fallback (line 104)
- Frontend hook only checks specific action (line 19)

### Why 5: Why wasn't this caught during implementation?

**Answer:** The hook was likely implemented before admin role testing, or admin role was tested with backend only (which works correctly).

---

## Evidence

### Code Analysis

**1. Frontend Hook (WRONG):**

```typescript
// apps/web/src/hooks/use-can-access.ts
export function useCanAccess(action: Actions, subject: Subjects): boolean {
  const { ability, loading } = useAbility();

  if (loading || !ability) {
    return false;
  }

  return ability.can(action, subject); // ❌ Missing manage:all check
}
```

**2. Backend Guard (CORRECT):**

```typescript
// apps/api/src/modules/authorization/guards/policies.guard.ts:68-104
// Check manage:all first (admin has full access)
if (ability.can("manage", "all")) {
  return true;
}

// For string subjects, check manage:subject or action:subject
if (typeof subject === "string") {
  return (
    ability.can(action, subject) || ability.can("manage", subject) // ✅ Checks manage:subject
  );
}
```

**3. Component Usage:**

```typescript
// apps/web/src/components/boss/kpi-attachment-upload.tsx:28-32
const canCreate = useCanAccess("create", "Kpi");

if (!canCreate) {
  return null; // Component hidden if permission check fails
}
```

**4. Admin Ability Setup:**

```typescript
// apps/api/src/modules/authorization/factories/casl-ability.factory.ts:42-45
// Admin has full access
if (userRoles.includes("admin")) {
  can("manage", "all");
  return build();
}
```

**5. Other Components (Correct Pattern):**

```typescript
// apps/web/src/components/layout/sidebar.tsx:124-127
const canAccess =
  ability.can(action, module) ||
  ability.can("manage", "all") || // ✅ Checks manage:all
  ability.can("manage", module); // ✅ Checks manage:subject
```

---

## Root Cause

**Primary Issue:** `useCanAccess` hook doesn't check `manage:all` or `manage:subject` permissions before checking specific actions.

**Impact:**

- Admin users with `manage:all` cannot see upload option
- Any user with `manage:subject` permission cannot see options
- Frontend permission checks are inconsistent with backend

**Why it works in backend:**

- `PoliciesGuard` correctly checks `manage:all` first
- Backend API calls work correctly for admin

**Why it fails in frontend:**

- `useCanAccess` only checks specific action
- Doesn't check `manage:all` or `manage:subject`
- Component hides itself when permission check fails

---

## Fix Plan

### Solution: Update `useCanAccess` Hook

**File:** `apps/web/src/hooks/use-can-access.ts`

**Current Implementation (WRONG):**

```typescript
export function useCanAccess(action: Actions, subject: Subjects): boolean {
  const { ability, loading } = useAbility();

  if (loading || !ability) {
    return false;
  }

  return ability.can(action, subject);
}
```

**Fixed Implementation (CORRECT):**

```typescript
export function useCanAccess(action: Actions, subject: Subjects): boolean {
  const { ability, loading } = useAbility();

  if (loading || !ability) {
    return false;
  }

  // Check manage:all first (admin has full access)
  if (ability.can("manage", "all")) {
    return true;
  }

  // Check specific action on subject
  if (ability.can(action, subject)) {
    return true;
  }

  // Check manage:subject (if user can manage the subject, they can perform any action)
  if (typeof subject === "string" && subject !== "all") {
    if (ability.can("manage", subject)) {
      return true;
    }
  }

  return false;
}
```

**Alternative (Shorter):**

```typescript
export function useCanAccess(action: Actions, subject: Subjects): boolean {
  const { ability, loading } = useAbility();

  if (loading || !ability) {
    return false;
  }

  // Check manage:all first (admin has full access)
  if (ability.can("manage", "all")) {
    return true;
  }

  // Check specific action or manage:subject
  return (
    ability.can(action, subject) ||
    (typeof subject === "string" &&
      subject !== "all" &&
      ability.can("manage", subject))
  );
}
```

---

## Verification Steps

### Step 1: Check Current Behavior

```bash
# Login as admin user
# Navigate to KPI page
# Check if upload PDF option is visible
```

### Step 2: Check Ability Rules

```bash
# In browser console (after login as admin):
# Check ability rules
# Should see: { action: "manage", subject: "all" }
```

### Step 3: Test After Fix

```bash
# After updating useCanAccess hook:
# 1. Rebuild frontend
# 2. Login as admin
# 3. Navigate to KPI page
# 4. Verify upload PDF option is visible
# 5. Test upload functionality
```

### Step 4: Verify Other Components

```bash
# Check if other components using useCanAccess work correctly
# Verify no regressions
```

---

## Related Files

- `apps/web/src/hooks/use-can-access.ts` - Hook to fix
- `apps/web/src/components/boss/kpi-attachment-upload.tsx` - Component using hook
- `apps/api/src/modules/authorization/guards/policies.guard.ts` - Backend reference (correct implementation)
- `apps/web/src/components/layout/sidebar.tsx` - Example of correct pattern

---

## Status

✅ **FIX IMPLEMENTED**

**Implementation:**

1. ✅ Updated `useCanAccess` hook to check `manage:all` and `manage:subject`
2. ✅ Build successful - no compilation errors
3. ⏳ Pending: Test with admin user
4. ⏳ Pending: Verify upload option appears
5. ⏳ Pending: Test upload functionality

**Changes Made:**

- File: `apps/web/src/hooks/use-can-access.ts`
- Added `manage:all` check first (admin full access)
- Added `manage:subject` check as fallback
- Matches backend `PoliciesGuard` logic

**Impact:**

- Affects all components using `useCanAccess` hook
- Improves consistency with backend permission checks
- Admin users will now have proper access to all features

---

**Next Steps:**

1. Test with admin user in browser
2. Verify upload PDF option appears
3. Test upload functionality
4. Verify no regressions in other components using `useCanAccess`

---

## UPDATE: Issue Persists After Fix

**Date:** 2026-01-12  
**Status:** 🔍 Additional Debugging Required

---

## New Problem

**Issue:** After implementing fix, both admin and regular users still cannot see upload PDF option.

**Possible Causes:**

1. **Ability not loaded correctly** - Rules may not be serialized properly
2. **CASL manage:all behavior** - May need additional checks
3. **Component rendering issue** - Component may be hidden for other reasons
4. **Ability rules format** - Rules may not be in correct format when deserialized

---

## Additional Debugging Steps

### Step 1: Check Ability Rules in Browser Console

```javascript
// After login, in browser console:
// Check if ability is loaded
const ability = window.__ABILITY__; // If exposed
// Or check via React DevTools

// Check ability rules
console.log("Ability rules:", ability?.rules);

// Test specific checks
console.log("can manage all:", ability?.can("manage", "all"));
console.log("can create Kpi:", ability?.can("create", "Kpi"));
console.log("can create all:", ability?.can("create", "all"));
```

### Step 2: Check API Response

```bash
# Check what rules are returned from backend
curl -X GET http://localhost:8085/auth/abilities \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

### Step 3: Add Debug Logging to Hook

**Temporary debug code:**

```typescript
export function useCanAccess(action: Actions, subject: Subjects): boolean {
  const { ability, loading } = useAbility();

  if (loading || !ability) {
    console.log("[useCanAccess] Loading or no ability", {
      loading,
      hasAbility: !!ability,
    });
    return false;
  }

  // Debug logging
  const canManageAll = ability.can("manage", "all");
  const canActionAll = ability.can(action, "all");
  const canActionSubject = ability.can(action, subject);
  const canManageSubject =
    typeof subject === "string" && subject !== "all"
      ? ability.can("manage", subject)
      : false;

  console.log("[useCanAccess] Debug:", {
    action,
    subject,
    canManageAll,
    canActionAll,
    canActionSubject,
    canManageSubject,
    rules: ability.rules,
  });

  // Check manage:all first (admin has full access)
  if (canManageAll) {
    return true;
  }

  // Check action on "all" subject
  if (canActionAll) {
    return true;
  }

  // Check specific action on subject
  if (canActionSubject) {
    return true;
  }

  // Check manage:subject
  if (canManageSubject) {
    return true;
  }

  return false;
}
```

### Step 4: Verify Component is Rendering

**Check if component receives correct props:**

```typescript
// In kpi-attachment-upload.tsx, add debug:
console.log("[KpiAttachmentUpload]", {
  kpiRecordId,
  folderId,
  canCreate,
  ability: useAbility(),
});
```

### Step 5: Check if folderId is Required

**Possible issue:** Component may require `folderId` to render:

```typescript
// apps/web/src/components/boss/kpi-attachment-upload.tsx
// Check if folderId is null/undefined
if (!folderId) {
  return null; // Component hidden if no folderId
}
```

**Check in KPI page:**

```typescript
// apps/web/src/app/[locale]/dashboard/kpi/page.tsx
// Verify departmentFolderId is set
console.log("departmentFolderId:", departmentFolderId);
```

---

## Potential Root Causes

### Cause 1: folderId Not Set

**Evidence:** Component may require `folderId` prop to render upload button.

**Check:**

```typescript
// In KPI page, check if departmentFolderId is set
{departmentFolderId && (
  <KpiAttachmentUpload
    kpiRecordId={record.id}
    folderId={departmentFolderId}  // ← May be null/undefined
    ...
  />
)}
```

### Cause 2: Ability Rules Not Serialized Correctly

**Issue:** When rules are serialized from backend and recreated on frontend, `manage:all` may not work as expected.

**Solution:** May need to check `ability.can(action, "all")` explicitly.

### Cause 3: Component Conditional Rendering

**Issue:** Component may have additional conditions that prevent rendering.

**Check:** Review all conditions in `KpiAttachmentUpload` component.

---

## Immediate Actions

1. **Add debug logging** to `useCanAccess` hook (temporary)
2. **Check browser console** for ability rules and permission checks
3. **Verify folderId** is set in KPI page
4. **Check API response** from `/auth/abilities` endpoint
5. **Test with different users** (admin, regular user) to compare

---

**Next Steps:** Run debugging steps above to identify the specific issue preventing upload option from appearing.

---

## CRITICAL FINDING: Component Requires folderId

**Date:** 2026-01-12  
**Status:** 🔍 Root Cause Identified

---

## Additional Root Cause

**Issue:** `KpiAttachmentUpload` component only renders when `departmentFolderId` is set.

**Evidence from code:**

```typescript
// apps/web/src/app/[locale]/dashboard/kpi/page.tsx:1875-1886
{departmentFolderId && (  // ← Component hidden if folderId is null
  <KpiAttachmentUpload
    kpiRecordId={record.id}
    folderId={departmentFolderId}
    ...
  />
)}
```

**folderId Loading Logic:**

```typescript
// apps/web/src/app/[locale]/dashboard/kpi/page.tsx:474-494
useEffect(() => {
  const loadFolderId = async () => {
    if (!selectedDepartmentId) {
      setDepartmentFolderId(null); // ← Set to null if no department selected
      return;
    }
    try {
      const folders = await api.get<Array<{ id: string; name: string }>>(
        `/storage/folders/tree/with-documents?departmentId=${selectedDepartmentId}`
      );
      if (folders && folders.length > 0) {
        setDepartmentFolderId(folders[0].id); // ← Only set if folders exist
      }
    } catch (err) {
      console.warn("Failed to load department folder:", err);
      setDepartmentFolderId(null); // ← Set to null on error
    }
  };
  loadFolderId();
}, [selectedDepartmentId]);
```

**Possible Issues:**

1. `selectedDepartmentId` is empty/null
2. API call fails (no folders returned)
3. Folders array is empty
4. Folder doesn't have `id` property

---

## Debugging Commands

### Step 1: Check Browser Console

```javascript
// In browser console (after login and navigate to KPI page):
// Check selectedDepartmentId
console.log('selectedDepartmentId:', /* check from React DevTools */);

// Check departmentFolderId
console.log('departmentFolderId:', /* check from React DevTools */);

// Check ability
const { ability } = /* get from useAbility hook via React DevTools */;
console.log('Ability rules:', ability?.rules);
console.log('can manage all:', ability?.can('manage', 'all'));
console.log('can create Kpi:', ability?.can('create', 'Kpi'));
```

### Step 2: Check API Response for Folders

```bash
# Test folder API (replace YOUR_TOKEN and DEPARTMENT_ID)
curl -X GET "http://localhost:8085/storage/folders/tree/with-documents?departmentId=YOUR_DEPARTMENT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

### Step 3: Check Department Selection

```bash
# Verify department is selected in UI
# Check if selectedDepartmentId dropdown has a value
```

### Step 4: Add Temporary Debug Logging

**In KPI page component, add:**

```typescript
useEffect(() => {
  console.log("[KPI Page] Debug:", {
    selectedDepartmentId,
    departmentFolderId,
    canCreate,
    canViewAttachments,
    recordsCount: records.length,
  });
}, [
  selectedDepartmentId,
  departmentFolderId,
  canCreate,
  canViewAttachments,
  records.length,
]);
```

---

## Root Cause Summary

**Two Potential Issues:**

1. **Permission Check Issue (FIXED):**
   - ✅ `useCanAccess` now checks `manage:all` and `manage:subject`
   - ✅ Added check for `ability.can(action, "all")`

2. **folderId Missing Issue (NEW):**
   - ❌ Component requires `departmentFolderId` to render
   - ❌ `departmentFolderId` may be null if:
     - No department selected
     - API call fails
     - No folders returned for department
     - Folder doesn't have `id` property

---

## Fix Plan (Updated)

### Fix 1: Verify folderId Loading (PRIORITY)

**Check if `departmentFolderId` is being set correctly:**

1. **Verify department is selected:**
   - Check if `selectedDepartmentId` has a value
   - Check if department dropdown shows selected value

2. **Verify API call succeeds:**
   - Check network tab for `/storage/folders/tree/with-documents` request
   - Verify response contains folders array
   - Verify first folder has `id` property

3. **Check for errors:**
   - Look for console warnings: "Failed to load department folder"
   - Check if API returns error

### Fix 2: Handle Missing folderId Gracefully

**Option A: Show upload even without folderId (if permission allows)**

```typescript
// Allow upload even if folderId is not set (will be created on backend)
{departmentFolderId ? (
  <KpiAttachmentUpload ... />
) : canCreate ? (
  <Button onClick={() => {/* Create folder first */}}>
    Create folder to upload
  </Button>
) : null}
```

**Option B: Auto-create folder if missing**

```typescript
// Auto-create folder if doesn't exist
useEffect(() => {
  if (selectedDepartmentId && !departmentFolderId) {
    // Create folder for department
  }
}, [selectedDepartmentId, departmentFolderId]);
```

---

## Immediate Actions

1. **Check browser console** for:
   - `selectedDepartmentId` value
   - `departmentFolderId` value
   - API errors
   - Ability rules

2. **Check network tab** for:
   - `/storage/folders/tree/with-documents` request
   - Response status and data

3. **Verify department selection:**
   - Ensure a department is selected in dropdown
   - Check if department has folders

4. **Test with debug logging:**
   - Add temporary console.logs
   - Check values at runtime

---

**Next Steps:**

1. Run debugging commands to check `departmentFolderId`
2. Verify department is selected
3. Check API response for folders
4. Fix folderId loading if needed

---

## UPDATE: Race Condition and Login Issue Fixed

**Date:** 2026-01-12  
**Status:** ✅ Fix Implemented

---

## Additional Root Causes Identified

### Issue 1: Race Condition with Department Selection

**Problem:** `departmentFolderId` useEffect only depends on `selectedDepartmentId`, but `selectedDepartmentId` is set asynchronously when departments load. This causes:
- On initial mount: `selectedDepartmentId` = "" → `departmentFolderId` = null
- When departments load: `selectedDepartmentId` is set, but `departmentFolderId` may not reload if the effect doesn't trigger properly

**Evidence:**
```typescript
// Line 224-233: selectedDepartmentId is set when departments load
useEffect(() => {
  if (departments.length > 0 && !selectedDepartmentId) {
    setSelectedDepartmentId(departments[0].id); // ← Set asynchronously
  }
}, [departments, selectedDepartmentId, selectedYear]);

// Line 475-494: departmentFolderId depends only on selectedDepartmentId
useEffect(() => {
  // ... load folderId
}, [selectedDepartmentId]); // ← May not trigger if selectedDepartmentId was already set
```

### Issue 2: Login/Logout State Not Reset

**Problem:** When user logs out and logs back in, `selectedDepartmentId` may retain old value, but `departmentFolderId` is not reloaded because the effect doesn't see a change.

**Evidence:**
- User logs out → `selectedDepartmentId` may still have value
- User logs in → `selectedDepartmentId` doesn't change → `departmentFolderId` effect doesn't run
- Component doesn't show upload button because `departmentFolderId` is null

### Issue 3: Department Selection Not Validated

**Problem:** If `selectedDepartmentId` is set but the department is no longer accessible (e.g., after login with different user), the code doesn't reset to a valid department.

---

## Fixes Implemented

### Fix 1: Add User Dependency to folderId Effect

**File:** `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

**Change:**
```typescript
// Before
useEffect(() => {
  // ... load folderId
}, [selectedDepartmentId]);

// After
useEffect(() => {
  // ... load folderId
}, [selectedDepartmentId, user]); // ← Reload when user changes (login/logout)
```

**Impact:**
- `departmentFolderId` will reload when user logs in/out
- Ensures folderId is loaded for the current user's accessible departments

### Fix 2: Validate Department Selection

**File:** `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

**Change:**
```typescript
// Before
useEffect(() => {
  if (departments.length > 0 && !selectedDepartmentId) {
    setSelectedDepartmentId(departments[0].id);
  } else if (departments.length === 0) {
    setSelectedDepartmentId("");
    setLoading(false);
  }
  setHasAttemptedAutoCreate(false);
}, [departments, selectedDepartmentId, selectedYear]);

// After
useEffect(() => {
  if (departments.length > 0 && !selectedDepartmentId) {
    // Set first department as default when departments are loaded and no department is selected
    setSelectedDepartmentId(departments[0].id);
  } else if (departments.length === 0) {
    // No accessible departments - clear selection
    setSelectedDepartmentId("");
    setLoading(false);
  } else if (selectedDepartmentId && !departments.find(d => d.id === selectedDepartmentId)) {
    // Current selected department is no longer accessible - reset to first available
    setSelectedDepartmentId(departments[0].id);
  }
  setHasAttemptedAutoCreate(false);
}, [departments, selectedDepartmentId, selectedYear]);
```

**Impact:**
- Validates that `selectedDepartmentId` is still accessible
- Resets to first available department if current selection is invalid
- Prevents stale department selection after login

### Fix 3: Handle Empty Folders Response

**File:** `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

**Change:**
```typescript
// Before
if (folders && folders.length > 0) {
  setDepartmentFolderId(folders[0].id);
}
// No else case - departmentFolderId may retain old value

// After
if (folders && folders.length > 0) {
  setDepartmentFolderId(folders[0].id);
} else {
  // No folders found for this department
  setDepartmentFolderId(null);
}
```

**Impact:**
- Explicitly sets `departmentFolderId` to null if no folders found
- Prevents stale folderId from previous department

---

## Testing Checklist

### Test Case 1: Initial Page Load
- [ ] Navigate to KPI page
- [ ] Verify department is auto-selected (first in list)
- [ ] Verify `departmentFolderId` is loaded
- [ ] Verify upload PDF button appears (if user has permission)

### Test Case 2: Department Change
- [ ] Select different department from dropdown
- [ ] Verify `departmentFolderId` reloads
- [ ] Verify upload PDF button still appears

### Test Case 3: Login/Logout
- [ ] Logout from application
- [ ] Login again
- [ ] Navigate to KPI page
- [ ] Verify department is selected
- [ ] Verify `departmentFolderId` is loaded
- [ ] Verify upload PDF button appears

### Test Case 4: Admin User
- [ ] Login as admin
- [ ] Navigate to KPI page
- [ ] Verify all departments are accessible
- [ ] Verify upload PDF button appears for all departments

### Test Case 5: Regular User
- [ ] Login as regular user (with KPI create permission)
- [ ] Navigate to KPI page
- [ ] Verify only accessible departments are shown
- [ ] Verify upload PDF button appears for accessible departments

### Test Case 6: User Without Departments
- [ ] Login as user without assigned departments
- [ ] Navigate to KPI page
- [ ] Verify no departments are shown
- [ ] Verify no upload PDF button (expected behavior)

---

## Summary of All Fixes

1. ✅ **Permission Check Fix**: Updated `useCanAccess` to check `manage:all` and `manage:subject`
2. ✅ **Action on All Subject**: Added check for `ability.can(action, "all")`
3. ✅ **Race Condition Fix**: Added `user` dependency to `departmentFolderId` effect
4. ✅ **Department Validation**: Added validation to reset invalid department selection
5. ✅ **Empty Folders Handling**: Explicitly set `departmentFolderId` to null when no folders found

---

**Status:** All fixes implemented. Ready for testing.

---

## UPDATE: Debug Logging Added

**Date:** 2026-01-12  
**Status:** 🔍 Debug Logging Enabled

---

## Debug Logging Added

### Files Modified

1. **`apps/web/src/components/boss/kpi-attachment-upload.tsx`**
   - Added console.log for `canCreate`, `folderId`, `kpiRecordId`
   - Logs when component renders and when permission check fails

2. **`apps/web/src/app/[locale]/dashboard/kpi/page.tsx`**
   - Added console.log for `departmentFolderId` loading process
   - Logs when folderId is loaded, when API fails, when no folders found

3. **`apps/web/src/hooks/use-can-access.ts`**
   - Added detailed console.log for all permission checks
   - Logs which permission check passes/fails
   - Logs ability rules for debugging

### How to Debug

1. **Open Browser Console** (F12 → Console tab)
2. **Navigate to KPI page**
3. **Look for logs with prefixes:**
   - `[KPI Page]` - Department folder loading
   - `[KpiAttachmentUpload]` - Component render status
   - `[useCanAccess]` - Permission checks

### Expected Logs

**When working correctly:**
```
[KPI Page] Loading folder for department: <department-id>
[KPI Page] Loaded folderId: <folder-id> for department: <department-id>
[useCanAccess] Allowed via manage:all { action: 'create', subject: 'Kpi' }
[KpiAttachmentUpload] Debug: { kpiRecordId: '...', folderId: '...', canCreate: true, hasFolderId: true }
```

**When not working:**
```
[KPI Page] No selectedDepartmentId, clearing departmentFolderId
// OR
[KPI Page] No folders found for department: <department-id>
// OR
[useCanAccess] DENIED { action: 'create', subject: 'Kpi', ... }
// OR
[KpiAttachmentUpload] Debug: { ..., canCreate: false, ... }
```

### Common Issues to Check

1. **departmentFolderId is null:**
   - Check `[KPI Page]` logs
   - Verify `selectedDepartmentId` is set
   - Check API response for `/storage/folders/tree/with-documents`

2. **canCreate is false:**
   - Check `[useCanAccess]` logs
   - Verify ability rules contain `manage:all` or `create:Kpi`
   - Check `/auth/abilities` API response

3. **Component not rendering:**
   - Check both `departmentFolderId` and `canCreate`
   - Verify component is in render tree (check React DevTools)

---

## Next Steps

1. **Open browser console** and navigate to KPI page
2. **Check console logs** for the debug messages above
3. **Share the logs** so we can identify the exact issue
4. **Check Network tab** for API calls:
   - `/auth/abilities` - Should return rules with `manage:all` for admin
   - `/storage/folders/tree/with-documents?departmentId=...` - Should return folders array

---

**Status:** Debug logging enabled. Please test and share console output.

---

## UPDATE: Fix Applied - Component Renders Based on Permission

**Date:** 2026-01-12  
**Status:** ✅ Fix Implemented

---

## Root Cause from Logs

**From user logs:**
1. ✅ Ability loading: `loading: true, hasAbility: false` - Ability đang load, nên `useCanAccess` return false
2. ❌ **No folders found**: `[KPI Page] No folders found for department: f77b8db2-45c8-4049-9ffc-b39066f2b978`
3. ❌ Component không render: Vì `departmentFolderId` là null, component không render

**Vấn đề chính:**
- Component chỉ render khi `departmentFolderId` có giá trị: `{departmentFolderId && <KpiAttachmentUpload ... />}`
- Nhưng API không trả về folders cho department, nên `departmentFolderId` là null
- Component không render → không thấy log `[KpiAttachmentUpload]`

---

## Fix Applied

### Change 1: Render Based on Permission, Not folderId

**File:** `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

**Before:**
```typescript
{departmentFolderId && (
  <KpiAttachmentUpload ... />
)}
```

**After:**
```typescript
{canCreateAttachments && (
  <KpiAttachmentUpload
    folderId={departmentFolderId || ""} // Allow empty, show error if needed
    ...
  />
)}
```

**Impact:**
- Component sẽ render dựa trên permission, không phụ thuộc vào `departmentFolderId`
- User sẽ thấy upload button ngay khi có permission
- Nếu `folderId` chưa có, component sẽ hiển thị error khi user click upload

### Change 2: Add folderId Validation in Component

**File:** `apps/web/src/components/boss/kpi-attachment-upload.tsx`

**Added:**
```typescript
// Check if folderId is available
if (!folderId) {
  toast({
    title: "Lỗi",
    description: "Không tìm thấy thư mục. Vui lòng chờ hoặc thử lại sau.",
    variant: "destructive",
  });
  return;
}
```

**Impact:**
- User sẽ thấy error message rõ ràng nếu folderId chưa có
- Component vẫn render, nhưng upload sẽ fail với message rõ ràng

### Change 3: Add canCreateAttachments Permission Check

**File:** `apps/web/src/app/[locale]/dashboard/kpi/page.tsx`

**Added:**
```typescript
const canCreateAttachments = useCanAccess("create", "Kpi");
```

**Impact:**
- Separate permission check for attachments (khác với `canCreate` từ `canCreateKpi` helper)
- More granular control

---

## Expected Behavior After Fix

1. **Component renders** khi user có `create:Kpi` permission (không cần `departmentFolderId`)
2. **Upload button visible** ngay khi permission check pass
3. **Error message** nếu user click upload mà `folderId` chưa có
4. **Upload succeeds** khi `folderId` có giá trị

---

## Testing

1. **Test with admin:**
   - Login as admin
   - Navigate to KPI page
   - Verify upload button appears (even if no folders)
   - Try upload → should see error if no folderId
   - Wait for folderId to load → try upload again → should succeed

2. **Test with regular user:**
   - Login as user with `create:Kpi` permission
   - Navigate to KPI page
   - Verify upload button appears
   - Test upload functionality

3. **Check console logs:**
   - Should see `[KpiAttachmentUpload] Debug` logs now (component renders)
   - Should see `[useCanAccess]` logs for `create:Kpi` action
   - Should see `[KPI Page]` logs for folder loading

---

**Status:** Fix implemented. Component now renders based on permission, not folderId.

---

## UPDATE: Unique Constraint Error Fixed

**Date:** 2026-01-12  
**Status:** ✅ Fix Implemented

---

## Problem: Unique Constraint Failed on Path

**Error:**
```
Unique constraint failed on the fields: (`path`)
Invalid `PrismaClientLike).folder.create()` invocation in
D:\documentsManager\apps\api\src\modules\kpi\services\kpi-attachment.service.ts:403:73
```

**Root Cause:**
- Code đang tìm folder bằng `findFirst` với `departmentId` và `parentId: null`
- Folder có thể đã tồn tại với path đó (từ seed hoặc sync) nhưng không có `departmentId` set
- Khi không tìm thấy, code cố gắng `create` với path đã tồn tại → unique constraint error

---

## Fix Applied

### Change 1: Find Folder by Path Instead of departmentId

**File:** `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`

**Before:**
```typescript
let departmentFolder = await folder.findFirst({
  where: {
    departmentId,
    parentId: null,
    deletedAt: null,
  },
});
```

**After:**
```typescript
// Get department info first
const department = await department.findUnique({ where: { id: departmentId } });
const folderPath = department.code;

// Find by path (unique) instead of departmentId
let departmentFolder = await folder.findUnique({
  where: { path: folderPath },
});
```

**Impact:**
- Tìm folder theo path (unique) thay vì departmentId
- Tránh trường hợp folder tồn tại nhưng không có departmentId

### Change 2: Handle Race Condition with Try-Catch

**File:** `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`

**Added:**
```typescript
try {
  departmentFolder = await folder.create({ ... });
} catch (error: unknown) {
  // Handle race condition: folder might have been created by another request
  const isUniqueConstraintError =
    error && typeof error === "object" && "code" in error && error.code === "P2002";
  
  if (isUniqueConstraintError) {
    // Fetch existing folder
    departmentFolder = await folder.findUnique({ where: { path: folderPath } });
  } else {
    throw error;
  }
}
```

**Impact:**
- Handle race condition khi nhiều requests cùng tạo folder
- Fetch existing folder nếu unique constraint error

### Change 3: Update Existing Folder if Needed

**File:** `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`

**Added:**
```typescript
if (departmentFolder) {
  // Folder exists - check if needs update
  if (!departmentFolder.departmentId || departmentFolder.deletedAt) {
    // Update departmentId and restore if deleted
    await folder.update({
      where: { id: departmentFolder.id },
      data: {
        departmentId: department.id,
        deletedAt: null,
      },
    });
  }
}
```

**Impact:**
- Update departmentId nếu folder tồn tại nhưng chưa có departmentId
- Restore folder nếu đã bị soft delete

### Change 4: Fix findOrCreateFolderByName to Use Path

**File:** `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`

**Before:**
```typescript
const existing = await folder.findFirst({
  where: { parentId, name: folderName, deletedAt: null },
});
```

**After:**
```typescript
const folderPath = `${parent.path}/${folderName}`;
const existing = await folder.findUnique({
  where: { path: folderPath },
});
```

**Impact:**
- Tìm folder theo path (unique) thay vì name+parentId
- Tránh duplicate và race condition

---

## Summary of All Fixes

1. ✅ **Permission Check Fix**: Updated `useCanAccess` to check `manage:all` and `manage:subject`
2. ✅ **Action on All Subject**: Added check for `ability.can(action, "all")`
3. ✅ **Race Condition Fix**: Added `user` dependency to `departmentFolderId` effect
4. ✅ **Department Validation**: Added validation to reset invalid department selection
5. ✅ **Empty Folders Handling**: Explicitly set `departmentFolderId` to null when no folders found
6. ✅ **Component Render Fix**: Render based on permission, not folderId
7. ✅ **Auto-Create Folder**: Backend auto-creates folder structure when folderId not provided
8. ✅ **Validation Fix**: `folderId` is optional, only validate UUID when provided
9. ✅ **Unique Constraint Fix**: Find folder by path, handle race condition with try-catch

---

**Status:** All fixes implemented. Ready for testing.
