# Debug Report: Admin không thấy Users và Permissions trong Sidebar

**Date:** 2025-12-26  
**Issue:** Admin đăng nhập nhưng không thấy "Users" và "Permission" trong sidebar navigation

---

## Root Cause Analysis

### Problem

Admin user có `manage:all` permission nhưng sidebar không hiển thị pages "Users" và "Permission".

### Investigation

#### 1. **Backend Ability Creation** ✅

```typescript
// apps/api/src/modules/authorization/factories/casl-ability.factory.ts:34-36
if (userRoles.includes("admin")) {
  can("manage", "all");
  return build();
}
```

**Status:** ✅ Correct - Admin được cấp `manage:all`

#### 2. **Ability Serialization** ✅

```typescript
// apps/api/src/modules/auth/auth.controller.ts:72-78
async getAbilities(@Request() req: AuthenticatedRequest) {
  const ability = await this.caslAbilityFactory.createForUser(
    req.user.id,
    req.user.roles || []
  );
  return { rules: ability.rules };
}
```

**Status:** ✅ Correct - Rules được serialize đúng

#### 3. **Frontend Ability Recreation** ✅

```typescript
// apps/web/src/hooks/use-ability.ts:28-32
const response = await api.get<{ rules: RawRuleOf<AppAbility>[] }>(
  "/auth/abilities"
);
const newAbility = createMongoAbility<AppAbility>(response.rules);
```

**Status:** ✅ Correct - Ability được recreate từ rules

#### 4. **Sidebar Permission Check** ⚠️ **POTENTIAL ISSUE**

```typescript
// apps/web/src/components/layout/sidebar.tsx:119
const canAccess = ability.can(action, module);
// Where action = "view", module = "User" or "Permission"
```

**Issue:** Sidebar đang check `ability.can("view", "User")` nhưng admin chỉ có `manage:all`.

**Expected Behavior:** CASL's `manage:all` should allow all actions (including "view") on all subjects (including "User").

**Actual Behavior:** Có thể CASL không interpret `manage:all` correctly cho specific subject checks.

---

## Root Cause

**CASL's `manage:all` rule should work**, nhưng có thể có issue với:

1. **Action Hierarchy:** CASL cần biết rằng `manage` includes `view`
2. **Subject Hierarchy:** CASL cần biết rằng `all` includes specific subjects như `"User"`

### CASL Behavior

Theo CASL documentation:

- `manage:all` should allow `view:User`, `view:Permission`, etc.
- `manage` action includes all other actions
- `all` subject includes all specific subjects

**Nhưng** có thể có issue với:

- Rule serialization/deserialization
- Ability type definition
- CASL version compatibility

---

## Verification Steps

### 1. Check Browser Console

Mở browser console và check:

```javascript
// In browser console after login as admin
// Check if ability is loaded correctly
console.log(ability.rules);
// Should show: [{ action: "manage", subject: "all" }]

// Test permission check
console.log(ability.can("view", "User")); // Should be true
console.log(ability.can("manage", "User")); // Should be true
```

### 2. Check Network Request

Check `/auth/abilities` response:

```json
{
  "rules": [
    {
      "action": "manage",
      "subject": "all"
    }
  ]
}
```

### 3. Check Sidebar Logic

Check trong sidebar component:

- `pages` array có chứa Users và Permission pages không?
- `ability` có được load đúng không?
- `isValidSubject` có filter out "User" và "Permission" không?

---

## Potential Solutions

### Solution 1: Explicit Permission Check (Recommended)

Thay vì check `ability.can("view", "User")`, check cả `manage:all`:

```typescript
// apps/web/src/components/layout/sidebar.tsx
const canAccess =
  ability.can(action, module) ||
  ability.can("manage", "all") ||
  ability.can("manage", module);
```

**Pros:**

- Explicit và rõ ràng
- Works với cả `manage:all` và specific permissions

**Cons:**

- Cần check nhiều conditions

### Solution 2: Fix CASL Rule Interpretation

Đảm bảo CASL interpret `manage:all` correctly. Có thể cần configure CASL:

```typescript
// Check if CASL needs explicit configuration
import { defineAbility } from "@casl/ability";

// Or use defineRulesFor helper
```

### Solution 3: Add Explicit Rules for Admin

Thay vì chỉ `manage:all`, thêm explicit rules:

```typescript
// Backend: casl-ability.factory.ts
if (userRoles.includes("admin")) {
  can("manage", "all");
  // Also add explicit view rules for all modules
  can("view", "User");
  can("view", "Department");
  can("view", "Kpi");
  can("view", "Maintenance");
  can("view", "Permission");
  return build();
}
```

**Pros:**

- Explicit và rõ ràng
- Works chắc chắn

**Cons:**

- Hardcode lại (nhưng acceptable cho admin)

### Solution 4: Check CASL Version

Có thể là issue với CASL version. Check:

- CASL version compatibility
- Rule format changes between versions

---

## Recommended Fix

**Solution 1** là recommended vì:

- Không cần thay đổi backend
- Works với cả `manage:all` và specific permissions
- Maintainable và clear

### Implementation

```typescript
// apps/web/src/components/layout/sidebar.tsx:119
// Replace:
const canAccess = ability.can(action, module);

// With:
const canAccess =
  ability.can(action, module) ||
  ability.can("manage", "all") ||
  ability.can("manage", module);
```

---

## Testing

Sau khi fix, test:

1. Login as admin
2. Check sidebar có hiển thị "Users" và "Permission"
3. Check có thể navigate đến các pages này
4. Check permission checks vẫn work cho non-admin users

---

## Additional Notes

- Test file `casl-ability.factory.spec.ts:372` expects `ability.can("view", "User")` to be true for admin
- This suggests CASL should handle `manage:all` correctly
- Issue có thể là với frontend ability recreation hoặc rule interpretation

---

**Next Steps:**

1. Verify browser console logs
2. Check network request response
3. Implement Solution 1 (recommended)
4. Test với admin và non-admin users
