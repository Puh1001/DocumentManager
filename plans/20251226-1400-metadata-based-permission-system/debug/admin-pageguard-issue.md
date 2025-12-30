# Debug Report: PageGuard Blocking Admin After Refresh

**Date:** 2025-12-26  
**Issue:** Admin có thể vào `/dashboard/users` trực tiếp nhưng F5 lại thì mất (PageGuard block)

---

## Root Cause

**PageGuard component** chưa check `manage:all` permission như sidebar đã fix.

### Current PageGuard Logic (Line 95)

```typescript
const canAccess = ability.can(action, module as Subjects);
// Only checks: ability.can("view", "User")
// Does NOT check: ability.can("manage", "all")
```

### Sidebar Logic (Already Fixed - Line 121-124)

```typescript
const canAccess =
  ability.can(action, module) ||
  ability.can("manage", "all") ||
  ability.can("manage", module);
```

### Why It Works When Navigating Directly

- Next.js có thể cache route
- SSR có thể render page trước khi ability load
- Client-side navigation có thể bypass PageGuard check

### Why It Fails on Refresh (F5)

- PageGuard re-render và check permission
- Ability có `manage:all` nhưng PageGuard chỉ check `view:User`
- CASL không tự động interpret `manage:all` → `view:User`
- PageGuard block page → hiển thị AccessDenied hoặc LoadingSpinner

---

## Solution

Fix PageGuard để check cả `manage:all` và `manage:module` giống sidebar:

```typescript
// apps/web/src/components/page-guard.tsx:95
// Change from:
const canAccess = ability.can(action, module as Subjects);

// To:
const canAccess =
  ability.can(action, module as Subjects) ||
  ability.can("manage", "all") ||
  ability.can("manage", module as Subjects);
```

---

## Impact

- ✅ Admin có thể access tất cả pages
- ✅ Non-admin users vẫn bị block đúng cách
- ✅ Consistent với sidebar logic
- ✅ Works cả khi navigate và refresh

---

## Testing

1. Login as admin
2. Navigate to `/dashboard/users` → Should work
3. F5 (refresh) → Should still work (không bị block)
4. Check sidebar → Should show Users and Permission
5. Test với non-admin user → Should still be blocked correctly
