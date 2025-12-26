# Brainstorm: Dynamic Permission System - Loại Bỏ Hardcode

**Ngày:** 2025-12-26  
**Mục tiêu:** Cải thiện hệ thống phân quyền để không cần động vào code khi thêm quyền hoặc thêm page

---

## 1. Phân Tích Hệ Thống Hiện Tại

### 1.1 Các Điểm Hardcode Hiện Tại

#### A. Page-to-Module Mapping (Backend)

```typescript
// apps/api/src/modules/authorization/constants/page-module-mapping.ts
export const PAGE_MODULE_MAPPING: Record<string, string> = {
  "/dashboard/users": "User",
  "/dashboard/departments": "Department",
  "/dashboard/kpi": "Kpi",
  "/dashboard/maintenance": "Maintenance",
  "/dashboard/permissions": "Permission",
} as const;
```

**Vấn đề:** Mỗi lần thêm page mới → phải sửa file này

#### B. Module List trong Ability Factory

```typescript
// apps/api/src/modules/authorization/factories/casl-ability.factory.ts
if (
  ["view", "manage", "create", "edit", "delete"].includes(action) &&
  ["User", "Department", "Kpi", "Maintenance", "Permission"].includes(module)
) {
  // ...
}
```

**Vấn đề:** Mỗi lần thêm module mới → phải sửa hardcode list

#### C. Sidebar Navigation (Frontend)

```typescript
// apps/web/src/components/layout/sidebar.tsx
const canViewUsers = useCanAccess("view", "User");
const canViewDepartments = useCanAccess("view", "Department");
const canViewKpi = useCanAccess("view", "Kpi");
// ... hardcode cho từng page

const allNavigation = [
  { name: "Users", href: "/dashboard/users", show: canViewUsers },
  {
    name: "Departments",
    href: "/dashboard/departments",
    show: canViewDepartments,
  },
  // ... hardcode navigation items
];
```

**Vấn đề:** Mỗi lần thêm page → phải thêm permission check và navigation item

#### D. Page Protection (Frontend)

```typescript
// apps/web/src/app/[locale]/dashboard/users/page.tsx
const canAccess = useCanAccess("view", "User");
if (!canAccess) return <AccessDenied />;
```

**Vấn đề:** Mỗi page phải hardcode permission check

#### E. Seed File

```typescript
// apps/api/prisma/seed.ts
const permissions = [
  { name: "view:User", description: "View user management page" },
  { name: "view:Department", description: "View department management page" },
  // ... hardcode permissions
];
```

**Vấn đề:** Mỗi lần thêm permission → phải sửa seed file

#### F. TypeScript Types

```typescript
// apps/api/src/modules/authorization/types/ability.types.ts
export type Subjects =
  | "User"
  | "Department"
  | "Kpi"
  | "Maintenance"
  | "Permission"
  | "all";
```

**Vấn đề:** Mỗi lần thêm module → phải update type

---

### 1.2 Quy Trình Hiện Tại (Khi Thêm Page Mới)

1. ✅ Tạo page component
2. ❌ Sửa `PAGE_MODULE_MAPPING` (backend)
3. ❌ Sửa `loadModulePermissions` validation (backend)
4. ❌ Sửa `Subjects` type (backend + frontend)
5. ❌ Thêm permission check vào page (frontend)
6. ❌ Thêm navigation item vào sidebar (frontend)
7. ❌ Thêm permission vào seed file
8. ❌ Chạy seed hoặc tạo permission thủ công

**Tổng cộng:** 7-8 bước, nhiều file cần sửa

---

## 2. So Sánh Với Hệ Thống Phân Quyền Hiện Đại

### 2.1 Các Hệ Thống Hiện Đại

#### A. **Keycloak / Auth0** (Identity Providers)

- ✅ **Dynamic Roles & Permissions**: Quản lý qua UI/API
- ✅ **Realm-based**: Mỗi realm có permissions riêng
- ✅ **Policy-based**: Rules động, không hardcode
- ❌ **Overhead**: Quá phức tạp cho use case đơn giản

#### B. **AWS IAM / Google Cloud IAM**

- ✅ **Resource-based**: Permissions gắn với resources
- ✅ **Policy Documents**: JSON-based, dễ cấu hình
- ✅ **Hierarchical**: Permissions kế thừa
- ❌ **Cloud-specific**: Không phù hợp cho on-premise

#### C. **Django Permissions / Laravel Gates**

- ✅ **Database-driven**: Permissions lưu trong DB
- ✅ **Dynamic**: Thêm permissions không cần code
- ✅ **Decorator-based**: `@require_perm('view:User')`
- ✅ **Auto-discovery**: Tự động phát hiện permissions từ models

#### D. **CASL với Dynamic Rules** (Cải tiến)

- ✅ **Rule-based**: Rules lưu trong database
- ✅ **Dynamic Subjects**: Subjects không hardcode
- ✅ **Policy Engine**: Có thể thêm policies động

---

### 2.2 Best Practices Hiện Đại

1. **Database-Driven Configuration**
   - Permissions, roles, pages lưu trong database
   - Quản lý qua UI, không cần code

2. **Auto-Discovery**
   - Tự động phát hiện pages/routes
   - Tự động tạo permissions

3. **Metadata-Based**
   - Pages có metadata (permission required, icon, order)
   - Sidebar tự động render từ metadata

4. **Policy-as-Code** (Optional)
   - Policies định nghĩa bằng config files
   - Dễ version control và review

---

## 3. Phương Án Cải Thiện

### 3.1 Phương Án 1: Database-Driven Pages & Permissions (Khuyến nghị)

#### Kiến Trúc:

**A. Database Schema Mới:**

```prisma
model Page {
  id          String   @id @default(uuid())
  path        String   @unique // "/dashboard/users"
  name        String   // "User Management"
  module      String   // "User" (subject name)
  icon        String?  // "Users" (lucide icon name)
  order       Int      @default(0)
  isActive    Boolean  @default(true)
  requiresAuth Boolean @default(true)
  permission  String? // "view:User" (optional, null = no permission needed)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("pages")
}

model Module {
  id          String   @id @default(uuid())
  name        String   @unique // "User", "Department", etc.
  displayName String   // "User Management"
  description String?
  isActive    Boolean  @default(true)

  permissions ModulePermission[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("modules")
}

model ModulePermission {
  id          String   @id @default(uuid())
  moduleId    String
  action      String   // "view", "manage", "create", etc.
  description String?

  module      Module   @relation(fields: [moduleId], references: [id])

  @@unique([moduleId, action])
  @@map("module_permissions")
}
```

**B. Backend Changes:**

1. **Dynamic Page-to-Module Mapping:**

```typescript
// apps/api/src/modules/authorization/services/page.service.ts
@Injectable()
export class PageService {
  async getPageByPath(path: string): Promise<Page | null> {
    return this.prisma.page.findUnique({ where: { path } });
  }

  async getAllPages(): Promise<Page[]> {
    return this.prisma.page.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
  }
}

// Replace hardcoded mapping
async function getModuleForPage(pagePath: string): Promise<string | null> {
  const page = await pageService.getPageByPath(pagePath);
  return page?.module || null;
}
```

2. **Dynamic Module Validation:**

```typescript
// Load modules from database instead of hardcode
private async loadModulePermissions(userId: string, roleIds: string[]) {
  const modules = await this.prisma.module.findMany({
    where: { isActive: true }
  });
  const moduleNames = modules.map(m => m.name);

  // Validate against dynamic modules
  if (parts.length === 2) {
    const [action, module] = parts;
    if (moduleNames.includes(module)) {
      // Valid module
    }
  }
}
```

3. **Dynamic Subjects Type:**

```typescript
// Use string union or Record type instead of hardcoded union
export type Subjects =
  | Document
  | Folder
  | string // Allow dynamic modules
  | "all";
```

**C. Frontend Changes:**

1. **Dynamic Sidebar:**

```typescript
// apps/web/src/components/layout/sidebar.tsx
export function Sidebar() {
  const { pages, loading } = usePages(); // Fetch from API

  if (loading) return <Loading />;

  return (
    <nav>
      {pages.map((page) => {
        const canAccess = page.permission
          ? useCanAccess(page.permission.split(':')[0], page.permission.split(':')[1])
          : true;

        if (!canAccess) return null;

        return (
          <Link href={page.path}>
            <Icon name={page.icon} />
            {page.name}
          </Link>
        );
      })}
    </nav>
  );
}
```

2. **Dynamic Page Protection:**

```typescript
// apps/web/src/components/page-guard.tsx
export function PageGuard({ children, path }: { children: ReactNode, path: string }) {
  const { page, loading } = usePage(path);
  const canAccess = page?.permission
    ? useCanAccess(page.permission.split(':')[0], page.permission.split(':')[1])
    : true;

  if (loading) return <Loading />;
  if (!canAccess) return <AccessDenied />;
  return <>{children}</>;
}

// Usage in page
export default function UsersPage() {
  return (
    <PageGuard path="/dashboard/users">
      {/* Page content */}
    </PageGuard>
  );
}
```

**D. Admin UI để Quản Lý:**

1. **Page Management UI:**
   - CRUD pages
   - Set permission required
   - Set icon, order
   - Enable/disable pages

2. **Module Management UI:**
   - CRUD modules
   - Auto-generate permissions (view, manage, create, edit, delete)
   - Enable/disable modules

**Ưu điểm:**

- ✅ Không cần code khi thêm page/permission
- ✅ Quản lý qua UI
- ✅ Dễ maintain
- ✅ Flexible

**Nhược điểm:**

- ⚠️ Cần migration database
- ⚠️ Cần refactor code
- ⚠️ Performance: Cần cache pages/modules

---

### 3.2 Phương Án 2: Metadata-Based với Auto-Discovery

#### Kiến Trúc:

**A. Page Metadata trong Code:**

```typescript
// apps/web/src/app/[locale]/dashboard/users/page.tsx
export const pageMetadata = {
  path: "/dashboard/users",
  name: "User Management",
  module: "User",
  icon: "Users",
  order: 3,
  permission: "view:User", // Optional
  requiresAuth: true,
};

export default function UsersPage() {
  // ...
}
```

**B. Auto-Discovery:**

```typescript
// apps/web/src/lib/page-registry.ts
export function registerPage(metadata: PageMetadata) {
  // Register page at build time or runtime
}

// Auto-discover from file system or imports
const pages = await discoverPages();
```

**C. Dynamic Sidebar từ Metadata:**

```typescript
// Fetch metadata from all pages
const pages = await fetchPageMetadata();
// Render sidebar dynamically
```

**Ưu điểm:**

- ✅ Ít thay đổi database
- ✅ Type-safe với TypeScript
- ✅ Auto-discovery

**Nhược điểm:**

- ⚠️ Vẫn cần sửa code (metadata)
- ⚠️ Phức tạp hơn phương án 1

---

### 3.3 Phương Án 3: Hybrid (Metadata + Database)

#### Kiến Trúc:

1. **Pages định nghĩa metadata trong code** (như phương án 2)
2. **Database lưu configuration** (permissions, visibility, order)
3. **Merge metadata + config** để render

**Ưu điểm:**

- ✅ Type-safe
- ✅ Flexible configuration
- ✅ Không cần hardcode

**Nhược điểm:**

- ⚠️ Phức tạp nhất
- ⚠️ Cần sync metadata và database

---

## 4. Đề Xuất: Phương Án 1 (Database-Driven)

### 4.1 Lý Do Chọn

1. **Đáp ứng yêu cầu:** Không cần code khi thêm page/permission
2. **KISS:** Đơn giản, dễ hiểu
3. **Scalable:** Dễ mở rộng
4. **Maintainable:** Quản lý qua UI

### 4.2 Implementation Plan

#### Phase 1: Database Schema

- [ ] Tạo `Page` model
- [ ] Tạo `Module` model
- [ ] Migration database
- [ ] Seed initial pages/modules

#### Phase 2: Backend Services

- [ ] `PageService` - CRUD pages
- [ ] `ModuleService` - CRUD modules
- [ ] Update `CaslAbilityFactory` - dynamic modules
- [ ] API endpoints cho pages/modules

#### Phase 3: Frontend Dynamic Components

- [ ] `usePages` hook - fetch pages
- [ ] Dynamic sidebar component
- [ ] `PageGuard` component
- [ ] Update all pages to use `PageGuard`

#### Phase 4: Admin UI

- [ ] Page management UI
- [ ] Module management UI
- [ ] Permission assignment UI

#### Phase 5: Migration & Cleanup

- [ ] Migrate existing pages to database
- [ ] Remove hardcoded mappings
- [ ] Remove hardcoded types (use string)
- [ ] Update documentation

---

## 5. Cải Tiến Bổ Sung

### 5.1 Permission Templates

```typescript
// Auto-generate permissions for new module
const defaultPermissions = [
  { action: "view", description: "View {module}" },
  { action: "create", description: "Create {module}" },
  { action: "edit", description: "Edit {module}" },
  { action: "delete", description: "Delete {module}" },
  { action: "manage", description: "Manage {module}" },
];
```

### 5.2 Permission Inheritance

```typescript
// Module permissions inherit from parent
Module: "Department"
  ├─ view:Department
  ├─ manage:Department
  └─ Sub-modules inherit permissions
```

### 5.3 Caching Strategy

```typescript
// Cache pages/modules in memory
@Injectable()
export class PageService {
  private cache = new Map<string, Page[]>();

  async getAllPages(forceRefresh = false) {
    if (!forceRefresh && this.cache.has("all")) {
      return this.cache.get("all");
    }
    const pages = await this.prisma.page.findMany();
    this.cache.set("all", pages);
    return pages;
  }
}
```

### 5.4 Audit & Versioning

```prisma
model PageVersion {
  id        String   @id @default(uuid())
  pageId    String
  changes   Json     // Track changes
  createdBy String
  createdAt DateTime @default(now())
}
```

---

## 6. Migration Path

### 6.1 Backward Compatibility

1. **Dual Mode:** Hỗ trợ cả hardcode và database
2. **Gradual Migration:** Migrate từng page một
3. **Fallback:** Nếu không tìm thấy trong DB, dùng hardcode

### 6.2 Rollout Strategy

1. **Phase 1:** Thêm database schema, giữ hardcode
2. **Phase 2:** Migrate pages vào database
3. **Phase 3:** Update code để dùng database
4. **Phase 4:** Remove hardcode
5. **Phase 5:** Add admin UI

---

## 7. Success Metrics

- ✅ **Zero Code Changes:** Thêm page/permission không cần code
- ✅ **Time to Market:** Giảm từ 30 phút → 5 phút
- ✅ **Error Rate:** Giảm lỗi do hardcode
- ✅ **Maintainability:** Dễ maintain hơn

---

## 8. Risks & Mitigation

| Risk                    | Probability | Impact | Mitigation                                |
| ----------------------- | ----------- | ------ | ----------------------------------------- |
| Performance degradation | Medium      | High   | Caching, lazy loading                     |
| Breaking changes        | Low         | High   | Backward compatibility, gradual migration |
| Data inconsistency      | Low         | Medium | Validation, constraints                   |
| Learning curve          | Low         | Low    | Documentation, training                   |

---

## 9. Next Steps

1. **Review & Approve:** Review phương án với team
2. **Create Detailed Plan:** Tạo implementation plan chi tiết
3. **Prototype:** Build prototype để validate
4. **Implement:** Theo implementation plan
5. **Test & Deploy:** Test kỹ và deploy

---

## 10. Conclusion

**Phương án đề xuất:** Database-Driven Pages & Permissions

**Lợi ích:**

- ✅ Không cần code khi thêm page/permission
- ✅ Quản lý qua UI
- ✅ Dễ maintain và scale

**Effort:** Medium (2-3 weeks)
**Risk:** Low (có backward compatibility)
**ROI:** High (tiết kiệm thời gian lâu dài)

