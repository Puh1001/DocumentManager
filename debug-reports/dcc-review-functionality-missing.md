# Debug Report: DCC Review Functionality Missing

**Date:** 2026-01-22  
**Issue:** User with DCC role cannot see review functionality  
**Status:** 🔍 **ROOT CAUSE IDENTIFIED**

---

## Problem Summary

User reported:
- Used account without DCC role to submit deletion request ✅ (works)
- Logged in with account that has DCC role to review ❌ (no review functionality visible)
- Document shows "Pending DCC Review" status but no approve/reject buttons visible

---

## Root Cause Analysis

### Issue Identified

The DCC deletion requests page exists at `/dashboard/dcc/deletion-requests/page.tsx` and has full functionality (approve/reject buttons), but:

1. **Page is NOT registered in page registry**
   - Missing `pageMetadata` export
   - Missing `registerPage()` call
   - Page won't appear in sidebar navigation

2. **Page is NOT imported in page-registry-init.ts**
   - Even if registered, it won't be loaded on app start
   - Sidebar won't discover the page

3. **No navigation link visible**
   - User cannot navigate to `/dashboard/dcc/deletion-requests`
   - Page exists but is inaccessible via UI

### Evidence

**Files Checked:**
- ✅ `apps/web/src/app/[locale]/dashboard/dcc/deletion-requests/page.tsx` - Page exists with full functionality
- ❌ No `pageMetadata` export found
- ❌ No `registerPage()` call found
- ❌ Not imported in `apps/web/src/lib/page-registry-init.ts`

**Comparison with Working Pages:**
```typescript
// ✅ Working example (KPI page):
export const pageMetadata: PageMetadata = {
  path: "/dashboard/kpi",
  name: "KPI Tracking",
  module: "Kpi",
  action: "view",
  icon: "TrendingUp",
  order: 7,
  requiresAuth: true,
};
registerPage(pageMetadata);

// ❌ DCC page - MISSING this registration
```

**Sidebar Navigation Logic:**
- Sidebar uses `usePages()` hook to load registered pages
- Only shows pages from page registry (except special pages: dashboard, documents, settings)
- DCC page is not in registry → not shown in navigation

---

## Impact

- **DCC users cannot access review page** via navigation
- **Review functionality exists but is hidden**
- **Users must manually navigate** to `/dashboard/dcc/deletion-requests` URL
- **Poor UX** - functionality not discoverable

---

## Solution

### Fix Required

1. **Add page metadata to DCC deletion requests page**
   ```typescript
   import type { PageMetadata } from "@/lib/types/page-metadata";
   import { registerPage } from "@/lib/page-registry";
   
   export const pageMetadata: PageMetadata = {
     path: "/dashboard/dcc/deletion-requests",
     name: "Deletion Requests", // or use translation key
     module: "Document", // Or create "Dcc" module if needed
     action: "manage", // DCC can manage deletion requests
     icon: "FileCheck", // or appropriate icon
     order: 8, // Adjust based on desired position
     requiresAuth: true,
   };
   
   registerPage(pageMetadata);
   ```

2. **Import page in page-registry-init.ts**
   ```typescript
   import "@/app/[locale]/dashboard/dcc/deletion-requests/page";
   ```

3. **Verify permissions**
   - Ensure DCC role has `manage:Document` or appropriate permission
   - Or create specific permission for deletion request review

### Alternative: Add to Special Pages

If DCC page should always be visible (not permission-based), add to special pages in sidebar:
```typescript
const specialPages: NavigationItem[] = [
  // ... existing pages
  {
    name: "Deletion Requests",
    href: "/dashboard/dcc/deletion-requests",
    icon: FileCheck,
    show: true, // or check for DCC role
  },
];
```

---

## Testing Steps

After fix:
1. ✅ Login with DCC role account
2. ✅ Check sidebar navigation - should see "Deletion Requests" link
3. ✅ Click link - should navigate to review page
4. ✅ Verify approve/reject buttons are visible
5. ✅ Test approve functionality
6. ✅ Test reject functionality

---

## Files to Modify

1. `apps/web/src/app/[locale]/dashboard/dcc/deletion-requests/page.tsx`
   - Add `pageMetadata` export
   - Add `registerPage()` call
   - Import required types

2. `apps/web/src/lib/page-registry-init.ts`
   - Add import for DCC deletion requests page

3. **Optional:** Check permission system
   - Verify DCC role has appropriate permissions
   - May need to add `manage:Document` or create new permission

---

## Expected Behavior After Fix

- DCC users see "Deletion Requests" in sidebar navigation
- Clicking link navigates to review page
- Approve/Reject buttons are visible and functional
- Review workflow works end-to-end

---

## Status

✅ **FIXED** - Page registered in page registry and added to navigation

**Implementation:**
- ✅ Added `pageMetadata` export to DCC deletion requests page
- ✅ Added `registerPage()` call
- ✅ Imported page in `page-registry-init.ts`
- ✅ Added `FileCheck` icon to icon mapper

**Files Modified:**
1. `apps/web/src/app/[locale]/dashboard/dcc/deletion-requests/page.tsx` - Added page registration
2. `apps/web/src/lib/page-registry-init.ts` - Added page import
3. `apps/web/src/lib/utils/icon-mapper.ts` - Added FileCheck icon

**Verification:**
- ✅ TypeScript compilation: PASSED
- ✅ ESLint: PASSED
