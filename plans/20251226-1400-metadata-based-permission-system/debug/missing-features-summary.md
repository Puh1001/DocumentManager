# Debug Report: Missing Features Summary

**Date:** 2025-12-26  
**Purpose:** Thống kê toàn bộ features còn thiếu trong Metadata-Based Permission System

---

## Summary

**Total Missing:** 6 major features  
**Priority Breakdown:**

- P0 (Critical): 1 feature
- P1 (High): 3 features
- P2 (Medium): 2 features

---

## Missing Features List

### 1. ❌ Module Management UI (P0 - Critical)

**Status:** Missing  
**Impact:** Admin không thể quản lý modules qua UI

**What's Missing:**

- ❌ Frontend page `/dashboard/modules`
- ❌ Module API client (`moduleApi` in `api.ts`)
- ❌ CRUD UI for modules
- ❌ View permissions for each module
- ❌ Integration with sidebar

**Current State:**

- ✅ Backend API có sẵn (`GET /modules`, `POST /modules`, etc.)
- ❌ Frontend không có UI

**Files Needed:**

- `apps/web/src/lib/api.ts` - Add `moduleApi`
- `apps/web/src/app/[locale]/dashboard/modules/page.tsx` - New page
- `apps/web/src/lib/page-registry-init.ts` - Add modules page import

**Estimated Time:** 2-3 hours

---

### 2. ❌ Auto-Discovery Script for Page Registry (P1 - High)

**Status:** Missing  
**Impact:** Phải manual update `page-registry-init.ts` mỗi khi thêm page

**What's Missing:**

- ❌ Build-time script để scan dashboard folder
- ❌ Auto-generate imports trong `page-registry-init.ts`
- ❌ Pre-build/pre-dev hooks để auto-run script

**Current State:**

- ✅ Page registry system hoạt động
- ❌ Phải manual import vào `page-registry-init.ts`

**Files Needed:**

- `scripts/update-page-registry.ts` - New script
- `apps/web/package.json` - Add pre-build/pre-dev hooks

**Estimated Time:** 1-2 hours

---

### 3. ❌ Seed File Auto-Generation (P1 - High)

**Status:** Missing  
**Impact:** New installations thiếu permissions (chỉ có "view")

**What's Missing:**

- ❌ Seed file không auto-generate permissions
- ❌ Chỉ tạo "view" permissions manually
- ❌ Thiếu: create, edit, delete, manage permissions

**Current State:**

```typescript
// seed.ts - Only creates "view" permissions
{ name: "view:User", description: "..." }
// Missing: create:User, edit:User, delete:User, manage:User
```

**Expected State:**

```typescript
// seed.ts - Auto-generate all permissions
const STANDARD_ACTIONS = ["view", "create", "edit", "delete", "manage"];
for (const module of modules) {
  for (const action of STANDARD_ACTIONS) {
    await prisma.permission.upsert({
      name: `${action}:${module.name}`,
      // ...
    });
  }
}
```

**Files Needed:**

- `apps/api/prisma/seed.ts` - Update to auto-generate permissions

**Estimated Time:** 30 minutes

---

### 4. ❌ Migration Script for Existing Databases (P1 - High)

**Status:** Missing  
**Impact:** Existing databases thiếu permissions

**What's Missing:**

- ❌ Script để generate missing permissions
- ❌ One-time migration cho existing databases
- ❌ Verification script

**Current State:**

- Existing modules: User, Department, Kpi, Maintenance, Permission
- Only have `view:{Module}` permissions
- Missing: `create`, `edit`, `delete`, `manage` permissions

**Files Needed:**

- `scripts/migrate-module-permissions.ts` - New script

**Estimated Time:** 1 hour

---

### 5. ❌ Workflow Documentation (P2 - Medium)

**Status:** Missing  
**Impact:** Developers không biết workflow khi thêm page mới

**What's Missing:**

- ❌ Step-by-step guide
- ❌ Workflow diagram
- ❌ Examples và best practices
- ❌ Troubleshooting guide

**Files Needed:**

- `docs/workflow-adding-new-page.md` - New document

**Estimated Time:** 1-2 hours

---

### 6. ❌ Module Permissions View Enhancement (P2 - Medium)

**Status:** Missing  
**Impact:** Khó xem permissions của từng module

**What's Missing:**

- ❌ Filter permissions by module in Permissions page
- ❌ Group permissions by module
- ❌ Show module info in permissions list

**Current State:**

- Permissions page shows all permissions
- No grouping/filtering by module

**Files Needed:**

- `apps/web/src/app/[locale]/dashboard/permissions/page.tsx` - Add filter/group

**Estimated Time:** 1 hour

---

## Complete Missing Features Table

| #   | Feature                   | Priority | Status     | Time | Impact   |
| --- | ------------------------- | -------- | ---------- | ---- | -------- |
| 1   | Module Management UI      | P0       | ❌ Missing | 2-3h | Critical |
| 2   | Auto-Discovery Script     | P1       | ❌ Missing | 1-2h | High     |
| 3   | Seed File Auto-Generation | P1       | ❌ Missing | 30m  | High     |
| 4   | Migration Script          | P1       | ❌ Missing | 1h   | High     |
| 5   | Workflow Documentation    | P2       | ❌ Missing | 1-2h | Medium   |
| 6   | Module Permissions View   | P2       | ❌ Missing | 1h   | Medium   |

**Total Missing Work:** ~7-10 hours

---

## Priority Breakdown

### Critical (P0) - Do First

1. **Module Management UI**
   - Blocking: Admin không thể quản lý modules
   - Workflow không hoàn chỉnh

### High Priority (P1) - Do Next

2. **Auto-Discovery Script**
   - Eliminate manual import step
   - Complete auto-discovery promise

3. **Seed File Auto-Generation**
   - Fix new installations
   - Consistent with ModuleService logic

4. **Migration Script**
   - Fix existing databases
   - One-time script

### Medium Priority (P2) - Nice to Have

5. **Workflow Documentation**
   - Help developers
   - Best practices

6. **Module Permissions View**
   - Better UX
   - Easier permission management

---

## Implementation Order

### Phase 1: Critical (Immediate)

1. Module Management UI (2-3 hours)
   - Add `moduleApi` to `api.ts`
   - Create `/dashboard/modules` page
   - CRUD operations
   - Show permissions

### Phase 2: High Priority (This Week)

2. Auto-Discovery Script (1-2 hours)
   - Create `update-page-registry.ts` script
   - Add pre-build/pre-dev hooks

3. Seed File Auto-Generation (30 minutes)
   - Update `seed.ts` to auto-generate permissions

4. Migration Script (1 hour)
   - Create `migrate-module-permissions.ts` script

### Phase 3: Medium Priority (Next Week)

5. Workflow Documentation (1-2 hours)
   - Create guide in `docs/`

6. Module Permissions View (1 hour)
   - Add filter/group in Permissions page

---

## Verification Checklist

### After Phase 1 (Critical):

- [ ] Admin can create modules via UI
- [ ] Admin can update modules via UI
- [ ] Admin can delete modules via UI
- [ ] Admin can view permissions for each module
- [ ] Modules page appears in sidebar

### After Phase 2 (High Priority):

- [ ] Script auto-generates imports
- [ ] Script auto-runs on dev/build
- [ ] No manual import needed
- [ ] Seed file auto-generates all permissions
- [ ] Migration script fixes existing databases

### After Phase 3 (Medium Priority):

- [ ] Workflow guide exists
- [ ] Examples provided
- [ ] Permissions page has module filter/group

---

## Current vs Complete State

### Current State (After Phases 1-7):

- ✅ Core infrastructure (DB, Backend API, Frontend metadata)
- ✅ Page registry system
- ✅ Dynamic sidebar
- ✅ PageGuard component
- ❌ Module Management UI
- ❌ Auto-discovery script
- ❌ Seed auto-generation
- ❌ Migration script
- ❌ Documentation
- ❌ UI enhancements

### Complete State (After All Phases):

- ✅ Core infrastructure
- ✅ Module Management UI
- ✅ Fully automatic workflow
- ✅ Complete seed/migration
- ✅ Documentation
- ✅ UI enhancements

**Completion:** ~50% → 100% (after missing features)

---

## Next Steps

**Immediate Actions:**

1. **Create Module Management UI** (P0)
2. **Create Auto-Discovery Script** (P1)
3. **Update Seed File** (P1)
4. **Create Migration Script** (P1)

**Estimated Total Time:** ~5-7 hours for critical + high priority

---

## Conclusion

**Missing Features:**

1. ✅ Module Management UI (P0)
2. ✅ Auto-Discovery Script (P1)
3. ✅ Seed File Auto-Generation (P1)
4. ✅ Migration Script (P1)
5. ✅ Workflow Documentation (P2)
6. ✅ Module Permissions View (P2)

**Total:** 6 features, ~7-10 hours work

**Recommendation:** Implement Phase 1 (Critical) + Phase 2 (High Priority) first.
