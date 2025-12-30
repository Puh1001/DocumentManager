# Debug Report: Permission Migration Issue

**Date:** 2025-12-26  
**Issue:** Admin không thấy Users và Permission pages - có thể do permissions chưa được migrate đúng cách

---

## Flow Analysis

### Phase 1: Database Schema ✅

- Module table created
- Modules seeded: User, Department, Kpi, Maintenance, Permission

### Phase 2: Module Service ✅

- ModuleService có `autoGeneratePermissions` method
- Auto-generate 5 permissions: `view`, `create`, `edit`, `delete`, `manage`
- Chỉ auto-generate khi **tạo module mới** qua API

### Seed File Analysis ⚠️

**Current Seed Flow:**

1. ✅ Create modules (User, Department, Kpi, Maintenance, Permission)
2. ✅ Create permissions manually:
   - `view:User`
   - `view:Department`
   - `view:Kpi`
   - `view:Maintenance`
   - `view:Permission`
3. ⚠️ **PROBLEM**: Seed file KHÔNG gọi `autoGeneratePermissions`
4. ⚠️ **PROBLEM**: Seed file chỉ tạo "view" permissions, không tạo `create`, `edit`, `delete`, `manage`

**Expected Flow:**

1. Create modules
2. Auto-generate ALL permissions for each module (view, create, edit, delete, manage)
3. Assign permissions to roles

---

## Root Cause

### Issue 1: Seed File Không Auto-Generate Permissions

**Current:**

```typescript
// seed.ts - Only creates "view" permissions manually
{ name: "view:User", description: "View user management page" },
{ name: "view:Department", description: "View department management page" },
// ... only view permissions
```

**Expected:**

```typescript
// Should auto-generate for each module:
// view:User, create:User, edit:User, delete:User, manage:User
// view:Department, create:Department, edit:Department, delete:Department, manage:Department
// ... etc
```

### Issue 2: Modules Đã Tồn Tại Không Có Permissions

- Modules được tạo trong seed
- Nhưng permissions chỉ có "view" action
- Không có `create`, `edit`, `delete`, `manage` permissions
- ModuleService chỉ auto-generate khi tạo module **mới** qua API

### Issue 3: Admin Role Permissions

- Admin có `manage:all` trong CaslAbilityFactory
- Nhưng có thể có issue với CASL interpretation
- Cần verify admin role có được assign permissions trong DB không

---

## Solutions

### Solution 1: Update Seed File (Recommended)

Update seed file để auto-generate permissions cho tất cả modules:

```typescript
// After creating modules
for (const module of modules) {
  const createdModule = await prisma.module.upsert({...});

  // Auto-generate permissions for this module
  const STANDARD_ACTIONS = ["view", "create", "edit", "delete", "manage"];
  for (const action of STANDARD_ACTIONS) {
    await prisma.permission.upsert({
      where: { name: `${action}:${module.name}` },
      update: {},
      create: {
        name: `${action}:${module.name}`,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.name} module`,
      },
    });
  }
}
```

### Solution 2: Migration Script

Tạo migration script để generate permissions cho existing modules:

```typescript
// migration script
const modules = await prisma.module.findMany();
for (const module of modules) {
  const STANDARD_ACTIONS = ["view", "create", "edit", "delete", "manage"];
  for (const action of STANDARD_ACTIONS) {
    await prisma.permission.upsert({
      where: { name: `${action}:${module.name}` },
      update: {},
      create: {
        name: `${action}:${module.name}`,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.name} module`,
      },
    });
  }
}
```

### Solution 3: Use ModuleService in Seed

Import ModuleService và gọi `autoGeneratePermissions`:

```typescript
// In seed.ts
import { ModuleService } from "./src/modules/authorization/services/module.service";

// After creating modules
for (const module of modules) {
  await moduleService.autoGeneratePermissions(module.name);
}
```

**Note:** Cần setup NestJS context trong seed file (phức tạp hơn)

---

## Verification Steps

### 1. Check Database

```sql
-- Check modules
SELECT * FROM modules;

-- Check permissions for User module
SELECT * FROM permissions WHERE name LIKE '%:User';

-- Expected: view:User, create:User, edit:User, delete:User, manage:User

-- Check permissions for Permission module
SELECT * FROM permissions WHERE name LIKE '%:Permission';

-- Expected: view:Permission, create:Permission, edit:Permission, delete:Permission, manage:Permission
```

### 2. Check Admin Role Permissions

```sql
-- Check admin role permissions
SELECT r.name, p.name
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'admin';
```

### 3. Check Ability Rules

```javascript
// In browser console after login
// Check ability rules
console.log(ability.rules);
// Should show: [{ action: "manage", subject: "all" }]
```

---

## Recommended Fix

**Option 1: Update Seed File (Easiest)**

Update `apps/api/prisma/seed.ts` để auto-generate permissions cho tất cả modules sau khi tạo modules.

**Option 2: Run Migration Script**

Tạo script riêng để migrate permissions cho existing modules, chạy một lần.

**Option 3: Manual Fix via API**

Use ModuleService API để trigger auto-generation (nếu modules đã tồn tại, cần workaround).

---

## Impact

- ✅ Fix sẽ tạo đầy đủ permissions cho tất cả modules
- ✅ Admin sẽ có đầy đủ permissions (hoặc rely on manage:all)
- ✅ Non-admin users có thể được assign specific permissions
- ✅ Consistent với ModuleService auto-generation logic

---

**Next Steps:**

1. Check database xem permissions có đầy đủ không
2. Update seed file hoặc tạo migration script
3. Re-run seed hoặc migration
4. Test lại admin access
