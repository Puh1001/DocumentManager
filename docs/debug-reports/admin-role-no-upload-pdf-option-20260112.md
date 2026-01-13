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
