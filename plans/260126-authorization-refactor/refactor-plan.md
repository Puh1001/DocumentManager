# Kế hoạch refactor: Cải thiện tính minh bạch và clean code cho hệ thống phân quyền

## Mục tiêu

1. Loại bỏ magic strings, dùng constants tập trung
2. Cải thiện type safety, loại bỏ type assertions không cần thiết
3. Đơn giản hóa logic phức tạp, tách thành methods nhỏ hơn
4. Thêm documentation đầy đủ
5. Đảm bảo tất cả endpoints có permission checks

## Phase 1: Consolidate Constants (Priority: High)

### 1.1 Tạo constants file tập trung
**File**: `apps/api/src/modules/authorization/constants/roles.constants.ts`

```typescript
export const SYSTEM_ROLES = {
  ADMIN: "admin",
  BOSS: "boss",
  MANAGER: "manager",
  EDITOR: "editor",
  VIEWER: "viewer",
  KPI_VIEWER_ALL: "kpi_viewer_all",
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const SYSTEM_ROLE_NAMES = Object.values(SYSTEM_ROLES) as readonly string[];
```

### 1.2 Update shared constants
**File**: `packages/shared/src/constants/index.ts`
- Thêm `KPI_VIEWER_ALL` vào ROLES
- Export từ authorization module

### 1.3 Replace magic strings
- `CaslAbilityFactory`: Dùng `SYSTEM_ROLES.ADMIN`, etc.
- `RoleService`: Dùng `SYSTEM_ROLE_NAMES`
- Tất cả files khác: Import và dùng constants

## Phase 2: Improve Type Safety (Priority: High)

### 2.1 Tạo type-safe permission parser
**File**: `apps/api/src/modules/authorization/utils/permission-parser.ts`

```typescript
export interface ParsedPermission {
  action: Actions;
  subject: string;
  isValid: boolean;
}

export function parsePermissionName(
  permName: string,
  validActions: readonly string[],
  validSubjects: readonly string[]
): ParsedPermission | null {
  // Type-safe parsing with validation
}
```

### 2.2 Loại bỏ @ts-expect-error
- Validate module names tại runtime
- Dùng type guards
- Tạo proper types cho dynamic modules

### 2.3 Type-safe subject validation
**File**: `apps/api/src/modules/authorization/utils/subject-validator.ts`

```typescript
export function isValidSubject(subject: string): subject is Subjects {
  // Runtime validation with type guard
}
```

## Phase 3: Refactor Complex Methods (Priority: Medium)

### 3.1 Refactor CaslAbilityFactory
**File**: `apps/api/src/modules/authorization/factories/casl-ability.factory.ts`

Tách `createForUser` thành:
- `applySpecialRolePermissions()` - Admin, Boss, KPI viewer
- `applyModulePermissions()` - Module permissions
- `applyKpiPermissions()` - KPI permissions
- `applyFolderPermissions()` - Folder permissions
- `applyDocumentPermissions()` - Document permissions

### 3.2 Refactor PoliciesGuard
**File**: `apps/api/src/modules/authorization/guards/policies.guard.ts`

Tách `execPolicyHandler` thành:
- `checkAllSubject()` - Handle "all" subject
- `checkDocumentPermission()` - Handle Document subject
- `checkFolderPermission()` - Handle Folder subject
- `checkModulePermission()` - Handle module subjects
- `checkCreatePermission()` - Handle create operations

### 3.3 Tạo helper functions
**File**: `apps/api/src/modules/authorization/utils/permission-helpers.ts`

```typescript
export function canManageAll(ability: AppAbility): boolean;
export function canPerformAction(ability: AppAbility, action: Actions, subject: Subjects): boolean;
export function extractResourceId(request: AuthenticatedRequest): string | null;
```

## Phase 4: Add Documentation (Priority: Medium)

### 4.1 JSDoc cho tất cả public methods
- Mô tả purpose
- Parameters với types
- Return values
- Examples nếu cần
- Throws nếu có

### 4.2 Inline comments cho logic phức tạp
- Giải thích business rules
- Permission inheritance logic
- Override behavior

## Phase 5: Audit & Security (Priority: High)

### 5.1 Audit tất cả endpoints
- List tất cả controllers
- Check mỗi endpoint có `@CheckPolicies` chưa
- Document missing checks

### 5.2 Add missing permission checks
- DocumentController endpoints
- Các endpoints khác thiếu

## Phase 6: Testing (Priority: High)

### 6.1 Unit tests cho refactored code
- Permission parser tests
- Subject validator tests
- Helper functions tests

### 6.2 Integration tests
- End-to-end permission checks
- Special roles behavior
- Permission inheritance

## Implementation Order

1. **Week 1**: Phase 1 (Constants) + Phase 2 (Type Safety)
2. **Week 2**: Phase 3 (Refactor) + Phase 4 (Documentation)
3. **Week 3**: Phase 5 (Audit) + Phase 6 (Testing)

## Success Criteria

- ✅ Không còn magic strings
- ✅ Type safety 100% (no @ts-expect-error, minimal type assertions)
- ✅ Tất cả methods có JSDoc
- ✅ Complex methods < 50 lines
- ✅ Tất cả endpoints có permission checks
- ✅ Test coverage > 80%
