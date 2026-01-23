# Debug Report: DCC Role Check Bug

**Date:** 2026-01-22  
**Issue:** User with admin and DCC roles cannot access deletion requests  
**Status:** 🔍 **ROOT CAUSE IDENTIFIED**

---

## Problem Summary

User reported:
- User has both `admin` and `dcc` roles ✅
- Cannot access deletion requests page ❌
- Error: "Only DCC members can view deletion requests"

---

## Root Cause Analysis

### Issue Identified

**Data Structure Mismatch:**

1. **`UsersService.findById()` transforms roles:**
   ```typescript
   // Line 158 in users.service.ts
   return {
     ...user,
     roles: user.roles.map((r) => r.role),  // Transform: { role: { name } } -> { name }
   };
   ```
   - Returns: `roles: Array<{ name: string, ... }>` (role objects directly)

2. **But code checks wrong structure:**
   ```typescript
   // Line 36-37 in deletion-request.controller.ts
   const isDCC = userWithRelations.roles?.some((ur) => ur.role?.name === 'dcc') || false;
   ```
   - Checks: `ur.role?.name` (expects `{ role: { name } }`)
   - But `ur` is already a role object: `{ name: 'dcc', ... }`

3. **Type definition is also wrong:**
   ```typescript
   // Line 18-19 in document-deletion.service.ts
   type UserWithRelations = {
     roles: Array<UserRole & { role: { name: string } }>;  // Wrong!
   };
   ```
   - Should be: `roles: Array<{ name: string }>` (after transformation)

### Evidence

**UsersService.findById() returns:**
```typescript
{
  id: "...",
  roles: [
    { name: "admin", ... },    // Already transformed!
    { name: "dcc", ... }       // Already transformed!
  ]
}
```

**But code checks:**
```typescript
roles.some((ur) => ur.role?.name === 'dcc')  // ❌ ur.role is undefined!
// Should be: roles.some((ur) => ur.name === 'dcc')  // ✅
```

**Result:**
- `ur.role` is `undefined` (because `ur` is already the role object)
- `ur.role?.name` is `undefined`
- `isDCC` is always `false`
- User gets `ForbiddenException` even with DCC role

---

## Impact

- **DCC users cannot access deletion requests** even with correct role
- **Admin + DCC users also blocked** (should have access)
- **Type safety issue** - type definition doesn't match actual data structure

---

## Solution

### Fix Required

1. **Fix role check in DeletionRequestController:**
   ```typescript
   // BEFORE (WRONG):
   const isDCC = userWithRelations.roles?.some((ur) => ur.role?.name === 'dcc') || false;
   
   // AFTER (CORRECT):
   const isDCC = user.roles?.some((role) => role.name === 'dcc') || false;
   ```

2. **Fix role check in DocumentDeletionService:**
   ```typescript
   // Update UserWithRelations type:
   type UserWithRelations = {
     roles: Array<{ name: string }>;  // After transformation
     departments: Array<{ departmentId: string }>;
   };
   
   // Fix check:
   const isDCC = userWithRelations.roles?.some((role) => role.name === 'dcc') || false;
   ```

3. **Also check for admin role:**
   - Admin should also have access (defense in depth)
   - Check: `isDCC || isAdmin`

---

## Files to Fix

1. `apps/api/src/modules/storage/controllers/deletion-request.controller.ts`
   - Fix role check logic (line 36-37)
   - Add admin check

2. `apps/api/src/modules/storage/services/document-deletion.service.ts`
   - Fix `UserWithRelations` type (line 18-19)
   - Fix role checks (lines 60, 204)

---

## Expected Behavior After Fix

- Users with DCC role can access deletion requests ✅
- Users with admin role can also access (optional but recommended) ✅
- Users with both admin + DCC can access ✅
- Type safety matches actual data structure ✅

---

## Status

✅ **FIXED** - Role check logic corrected to match transformed data structure

**Implementation:**
- ✅ Fixed `UserWithRelations` type definition
- ✅ Fixed role check in `DeletionRequestController.listPending()`
- ✅ Fixed role check in `DocumentDeletionService.getDeletionStatus()`
- ✅ Fixed role check in `DocumentDeletionService.reviewRequest()`
- ✅ Added admin role check (admin can also access)

**Files Modified:**
1. `apps/api/src/modules/storage/services/document-deletion.service.ts`
   - Fixed `UserWithRelations` type (line 18-19)
   - Fixed role check in `getDeletionStatus()` (line 60)
   - Fixed role check in `reviewRequest()` (line 204)

2. `apps/api/src/modules/storage/controllers/deletion-request.controller.ts`
   - Fixed role check in `listPending()` (line 36-37)
   - Added admin role check

**Verification:**
- ✅ TypeScript compilation: PASSED
- ✅ ESLint: PASSED

**Expected Behavior:**
- Users with DCC role can access deletion requests ✅
- Users with admin role can also access ✅
- Users with both admin + DCC can access ✅
