# Phân tích vấn đề Hardcode trong Hệ thống Phân quyền

**Date:** 2026-01-26  
**Status:** 🔍 **PHÂN TÍCH HOÀN TẤT**

---

## Vấn đề phát hiện

### 1. Hardcode Role Names

**Vị trí:** `apps/api/src/modules/authorization/factories/casl-ability.factory.ts`

```typescript
// ❌ HARDCODE
if (userRoles.includes("admin")) {
  can("manage", "all");
  return build();
}

if (userRoles.includes("boss")) {
  can("view", "all");
  can("download", "all");
  can("print", "all");
  return build();
}

if (userRoles.includes("kpi_viewer_all")) {
  can("view", "Kpi");
  can("download", "Kpi");
  can("print", "Kpi");
}
```

**Vấn đề:**
- Role names hardcode trong code
- Không thể thay đổi role names mà không sửa code
- Khó maintain khi thêm roles mới

---

### 2. Hardcode System Roles

**Vị trí:** `apps/api/src/modules/authorization/services/role.service.ts`

```typescript
// ❌ HARDCODE
const SYSTEM_ROLES = ["admin", "boss", "manager", "editor", "viewer"];
```

**Vấn đề:**
- System roles hardcode
- Thiếu `kpi_viewer_all` trong list
- Không thể thêm system roles mới mà không sửa code

---

### 3. Logic đặc biệt không lưu trong Database

**Vấn đề:**
- Admin có `manage:all` - **KHÔNG** lưu trong DB
- Boss có `view:all`, `download:all`, `print:all` - **KHÔNG** lưu trong DB
- kpi_viewer_all có `view:Kpi`, `download:Kpi`, `print:Kpi` - **CÓ THỂ** lưu nhưng logic vẫn hardcode

**Hậu quả:**
- Không minh bạch: không biết role nào có quyền gì
- Không thể query từ database để xem permissions
- Khó audit và debug
- Không thể thay đổi permissions mà không deploy code mới

---

### 4. Thiếu Constants

**Vị trí:** `packages/shared/src/constants/index.ts`

```typescript
// ✅ Có nhưng thiếu
export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  EDITOR: "editor",
  VIEWER: "viewer",
  BOSS: "boss",
  // ❌ Thiếu: KPI_VIEWER_ALL: "kpi_viewer_all"
} as const;
```

**Vấn đề:**
- Thiếu constants cho special permissions (`manage:all`, `view:all`)
- Thiếu `kpi_viewer_all` role
- Không có constants cho special subjects (`all`)

---

## Giải pháp đề xuất

### Giải pháp 1: Lưu Special Permissions vào Database (RECOMMENDED)

**Ý tưởng:** Lưu các permissions đặc biệt (`manage:all`, `view:all`, etc.) vào `RolePermission` table.

**Implementation:**

1. **Tạo special permissions trong database:**
   ```typescript
   // Seed special permissions
   const specialPermissions = [
     { name: "manage:all", description: "Full access to all resources" },
     { name: "view:all", description: "View all resources" },
     { name: "download:all", description: "Download all resources" },
     { name: "print:all", description: "Print all resources" },
   ];
   ```

2. **Assign permissions to roles:**
   ```typescript
   // Admin role gets manage:all
   await prisma.rolePermission.create({
     roleId: adminRole.id,
     permissionId: manageAllPerm.id,
   });
   
   // Boss role gets view:all, download:all, print:all
   await prisma.rolePermission.createMany({
     data: [
       { roleId: bossRole.id, permissionId: viewAllPerm.id },
       { roleId: bossRole.id, permissionId: downloadAllPerm.id },
       { roleId: bossRole.id, permissionId: printAllPerm.id },
     ],
   });
   ```

3. **Refactor CaslAbilityFactory:**
   ```typescript
   async createForUser(userId: string, userRoles: string[]): Promise<AppAbility> {
     const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
     
     // Load role IDs
     const roleIds = await this.loadRoleIds(userRoles);
     
     // Load ALL permissions (including special ones like manage:all)
     const rolePermissions = await this.prisma.rolePermission.findMany({
       where: { roleId: { in: roleIds } },
       include: { permission: true },
     });
     
     // Apply permissions
     for (const rp of rolePermissions) {
       const parsed = this.parsePermissionName(rp.permission.name);
       
       if (parsed) {
         // Handle action:Subject format (view:User, manage:Department)
         const { action, subject } = parsed;
         can(action as Actions, subject as Subjects);
       } else {
         // Handle simple permissions (view, download, etc.)
         // These are for folder/document level
         // Skip here, handled in loadFolderPermissions
       }
     }
     
     // Load folder/document permissions...
     // ...
     
     return build();
   }
   ```

**Ưu điểm:**
- ✅ Minh bạch: tất cả permissions lưu trong DB
- ✅ Có thể query và audit
- ✅ Có thể thay đổi permissions mà không cần deploy
- ✅ Không hardcode logic

**Nhược điểm:**
- ⚠️ Cần migration để thêm special permissions
- ⚠️ Cần refactor CaslAbilityFactory

---

### Giải pháp 2: Tạo Role Metadata Model

**Ý tưởng:** Tạo model `RoleMetadata` để lưu các capabilities đặc biệt của roles.

**Schema:**
```prisma
model RoleMetadata {
  id          String   @id @default(uuid())
  roleId      String   @unique @map("role_id")
  isSystem    Boolean  @default(false) @map("is_system")
  capabilities Json     // { "manageAll": true, "viewAll": true, etc. }
  
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  
  @@map("role_metadata")
}
```

**Ưu điểm:**
- ✅ Flexible: có thể lưu bất kỳ metadata nào
- ✅ Tách biệt logic đặc biệt

**Nhược điểm:**
- ⚠️ Thêm complexity
- ⚠️ Vẫn cần hardcode logic để parse capabilities

---

### Giải pháp 3: Dùng Constants + Database (HYBRID)

**Ý tưởng:** 
- Constants cho role names (để type safety)
- Database cho permissions (để minh bạch)

**Implementation:**

1. **Tạo constants file:**
   ```typescript
   // apps/api/src/modules/authorization/constants/roles.constants.ts
   export const ROLE_NAMES = {
     ADMIN: "admin",
     BOSS: "boss",
     MANAGER: "manager",
     EDITOR: "editor",
     VIEWER: "viewer",
     KPI_VIEWER_ALL: "kpi_viewer_all",
   } as const;
   
   export const SYSTEM_ROLE_NAMES = [
     ROLE_NAMES.ADMIN,
     ROLE_NAMES.BOSS,
     ROLE_NAMES.MANAGER,
     ROLE_NAMES.EDITOR,
     ROLE_NAMES.VIEWER,
   ] as const;
   
   // Special permissions
   export const SPECIAL_PERMISSIONS = {
     MANAGE_ALL: "manage:all",
     VIEW_ALL: "view:all",
     DOWNLOAD_ALL: "download:all",
     PRINT_ALL: "print:all",
   } as const;
   ```

2. **Refactor CaslAbilityFactory:**
   ```typescript
   import { ROLE_NAMES, SPECIAL_PERMISSIONS } from "../constants/roles.constants";
   
   async createForUser(userId: string, userRoles: string[]): Promise<AppAbility> {
     const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
     
     // Load role IDs
     const roleIds = await this.loadRoleIds(userRoles);
     
     // Load permissions from database
     const rolePermissions = await this.loadRolePermissions(roleIds);
     
     // Check for special permissions (from database)
     const hasManageAll = rolePermissions.some(
       (rp) => rp.permission.name === SPECIAL_PERMISSIONS.MANAGE_ALL
     );
     
     if (hasManageAll) {
       can("manage", "all");
       return build();
     }
     
     // Check for view:all, download:all, print:all
     const hasViewAll = rolePermissions.some(
       (rp) => rp.permission.name === SPECIAL_PERMISSIONS.VIEW_ALL
     );
     // ... similar for download:all, print:all
     
     // Load other permissions...
     // ...
     
     return build();
   }
   ```

**Ưu điểm:**
- ✅ Type safety với constants
- ✅ Minh bạch với database
- ✅ Dễ maintain

---

## Recommendation

**Chọn Giải pháp 1 + 3 (Hybrid):**

1. **Tạo constants file** cho role names và special permissions
2. **Lưu special permissions vào database** (`manage:all`, `view:all`, etc.)
3. **Refactor CaslAbilityFactory** để load từ database thay vì hardcode
4. **Update seed script** để tạo special permissions và assign cho roles

**Lợi ích:**
- ✅ Loại bỏ hardcode
- ✅ Minh bạch: tất cả permissions query được từ DB
- ✅ Type safety với constants
- ✅ Có thể thay đổi permissions mà không cần deploy
- ✅ Dễ audit và debug

---

## Files cần sửa

1. **Tạo constants:**
   - `apps/api/src/modules/authorization/constants/roles.constants.ts` (NEW)
   - Update `packages/shared/src/constants/index.ts`

2. **Refactor CaslAbilityFactory:**
   - `apps/api/src/modules/authorization/factories/casl-ability.factory.ts`

3. **Update RoleService:**
   - `apps/api/src/modules/authorization/services/role.service.ts`
   - Dùng constants thay vì hardcode SYSTEM_ROLES

4. **Update seed script:**
   - `apps/api/prisma/seed.ts`
   - Tạo special permissions và assign cho roles

5. **Migration (nếu cần):**
   - Tạo migration để seed special permissions

---

## Next Steps

1. ✅ Phân tích hoàn tất
2. ⏳ Implement constants file
3. ⏳ Refactor CaslAbilityFactory
4. ⏳ Update seed script
5. ⏳ Test và verify
