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

  return ability.can(action, subject);  // ❌ Only checks specific action, not manage:all
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

  return ability.can(action, subject);  // ❌ Missing manage:all check
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
    ability.can(action, subject) ||
    ability.can("manage", subject)  // ✅ Checks manage:subject
  );
}
```

**3. Component Usage:**
```typescript
// apps/web/src/components/boss/kpi-attachment-upload.tsx:28-32
const canCreate = useCanAccess("create", "Kpi");

if (!canCreate) {
  return null;  // Component hidden if permission check fails
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
  ability.can("manage", "all") ||      // ✅ Checks manage:all
  ability.can("manage", module);       // ✅ Checks manage:subject
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
    (typeof subject === "string" && subject !== "all" && ability.can("manage", subject))
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
