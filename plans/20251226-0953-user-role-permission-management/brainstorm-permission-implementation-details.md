# Brainstorm: Chi Tiết Cách Phân Quyền - Metadata-Based vs Database-Driven

**Ngày:** 2025-12-26  
**Mục tiêu:** Làm rõ cách phân quyền hoạt động ở các phương án, đặc biệt về việc hardcode permission

---

## 1. Câu Hỏi Cốt Lõi

**User hỏi:**

1. Mô tả chi tiết cách phân quyền được thực hiện ở các phương án
2. Metadata-Based có phải hardcode permission không?

**Phân tích:**

- User lo lắng về việc phải hardcode permission trong metadata
- Cần hiểu rõ sự khác biệt giữa:
  - **Permission Definition** (tên permission)
  - **Permission Assignment** (gán permission cho role)
  - **Permission Check** (kiểm tra quyền)

---

## 2. Cách Phân Quyền Hiện Tại (Hardcode)

### 2.1 Flow Phân Quyền

```
1. Permission Definition (DB)
   └─ Permission table: { name: "view:User", description: "..." }
   └─ Tạo trong seed file hoặc qua UI

2. Permission Assignment (DB)
   └─ RolePermission table: { roleId, permissionId }
   └─ Admin assign permission cho role qua UI

3. Ability Creation (Backend)
   └─ CaslAbilityFactory.loadModulePermissions()
   └─ Load permissions từ RolePermission
   └─ Parse "view:User" → action="view", module="User"
   └─ can("view", "User")

4. Permission Check (Frontend)
   └─ useCanAccess("view", "User")
   └─ Check ability.can("view", "User")
```

### 2.2 Các Điểm Hardcode

#### A. Permission Name trong Code

```typescript
// apps/web/src/app/[locale]/dashboard/users/page.tsx
const canAccess = useCanAccess("view", "User"); // ❌ Hardcode "view", "User"
if (!canAccess) return <AccessDenied />;
```

#### B. Module List trong Backend

```typescript
// apps/api/src/modules/authorization/factories/casl-ability.factory.ts
if (
  ["view", "manage", "create", "edit", "delete"].includes(action) &&
  ["User", "Department", "Kpi", "Maintenance", "Permission"].includes(module) // ❌ Hardcode
) {
  // ...
}
```

#### C. Navigation Items trong Sidebar

```typescript
// apps/web/src/components/layout/sidebar.tsx
const canViewUsers = useCanAccess("view", "User"); // ❌ Hardcode
const canViewDepartments = useCanAccess("view", "Department"); // ❌ Hardcode
// ...
```

### 2.3 Vấn Đề

- ❌ **Permission check hardcode** trong mỗi page
- ❌ **Module list hardcode** trong backend
- ❌ **Navigation items hardcode** trong sidebar
- ✅ **Permission assignment** không hardcode (qua UI)

---

## 3. Phương Án 1: Database-Driven (Full DB)

### 3.1 Flow Phân Quyền

```
1. Permission Definition (DB)
   └─ Permission table: { name: "view:User", description: "..." }
   └─ Tạo qua Admin UI hoặc auto-generate khi tạo Module

2. Permission Assignment (DB)
   └─ RolePermission table: { roleId, permissionId }
   └─ Admin assign permission cho role qua UI

3. Page Definition (DB)
   └─ Page table: { path: "/dashboard/users", module: "User", permission: "view:User" }
   └─ Admin tạo page record qua UI

4. Ability Creation (Backend)
   └─ CaslAbilityFactory.loadModulePermissions()
   └─ Load permissions từ RolePermission (KHÔNG THAY ĐỔI)
   └─ Parse "view:User" → action="view", module="User"
   └─ can("view", "User")

5. Permission Check (Frontend)
   └─ PageGuard component tự động check
   └─ Load page từ DB → get permission → check ability
   └─ KHÔNG CẦN hardcode trong page component
```

### 3.2 Code Example

#### A. Page Component (Không Hardcode)

```typescript
// apps/web/src/app/[locale]/dashboard/users/page.tsx
"use client";

import { PageGuard } from "@/components/page-guard";

export default function UsersPage() {
  return (
    <PageGuard path="/dashboard/users">
      {/* Page content - KHÔNG CẦN permission check */}
    </PageGuard>
  );
}
```

#### B. PageGuard Component (Dynamic)

```typescript
// apps/web/src/components/page-guard.tsx
export function PageGuard({ path, children }: { path: string, children: ReactNode }) {
  const { page, loading } = usePage(path); // Fetch từ API

  if (loading) return <Loading />;

  if (!page) return <NotFound />;

  // Dynamic permission check
  const canAccess = page.permission
    ? useCanAccess(
        page.permission.split(':')[0], // "view"
        page.permission.split(':')[1]  // "User"
      )
    : true;

  if (!canAccess) return <AccessDenied />;

  return <>{children}</>;
}
```

#### C. Sidebar (Dynamic)

```typescript
// apps/web/src/components/layout/sidebar.tsx
export function Sidebar() {
  const { pages, loading } = usePages(); // Fetch từ API

  if (loading) return <Loading />;

  return (
    <nav>
      {pages.map((page) => {
        // Dynamic permission check
        const canAccess = page.permission
          ? useCanAccess(
              page.permission.split(':')[0],
              page.permission.split(':')[1]
            )
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

### 3.3 Phân Tích

**Permission Definition:**

- ✅ **KHÔNG hardcode** - Tạo qua UI hoặc auto-generate

**Permission Assignment:**

- ✅ **KHÔNG hardcode** - Qua Admin UI

**Permission Check:**

- ✅ **KHÔNG hardcode** - Dynamic từ DB

**Module List:**

- ✅ **KHÔNG hardcode** - Load từ Module table trong DB

**Navigation Items:**

- ✅ **KHÔNG hardcode** - Load từ Page table trong DB

---

## 4. Phương Án 2: Metadata-Based (Code Metadata)

### 4.1 Flow Phân Quyền

```
1. Permission Definition (DB)
   └─ Permission table: { name: "view:User", description: "..." }
   └─ Tạo qua Admin UI hoặc auto-generate khi tạo Module

2. Permission Assignment (DB)
   └─ RolePermission table: { roleId, permissionId }
   └─ Admin assign permission cho role qua UI

3. Page Metadata (Code)
   └─ pageMetadata = { path: "/dashboard/users", module: "User", permission: "view:User" }
   └─ Định nghĩa trong page component

4. Ability Creation (Backend)
   └─ CaslAbilityFactory.loadModulePermissions()
   └─ Load permissions từ RolePermission (KHÔNG THAY ĐỔI)
   └─ Parse "view:User" → action="view", module="User"
   └─ can("view", "User")

5. Permission Check (Frontend)
   └─ PageGuard component tự động check từ metadata
   └─ KHÔNG CẦN hardcode trong page component
```

### 4.2 Code Example

#### A. Page Component (Metadata, KHÔNG Hardcode Check)

```typescript
// apps/web/src/app/[locale]/dashboard/users/page.tsx
"use client";

import { PageGuard } from "@/components/page-guard";

// Metadata định nghĩa page
export const pageMetadata = {
  path: "/dashboard/users",
  name: "User Management",
  module: "User", // Reference to Module.name in DB
  permission: "view:User", // Permission name (phải match với DB)
  icon: "Users",
  order: 5,
};

export default function UsersPage() {
  return (
    <PageGuard metadata={pageMetadata}>
      {/* Page content - KHÔNG CẦN permission check */}
    </PageGuard>
  );
}
```

#### B. PageGuard Component (Từ Metadata)

```typescript
// apps/web/src/components/page-guard.tsx
export function PageGuard({ metadata, children }: {
  metadata: PageMetadata,
  children: ReactNode
}) {
  // Dynamic permission check từ metadata
  const canAccess = metadata.permission
    ? useCanAccess(
        metadata.permission.split(':')[0], // "view"
        metadata.permission.split(':')[1]  // "User"
      )
    : true;

  if (!canAccess) return <AccessDenied />;

  return <>{children}</>;
}
```

#### C. Sidebar (Auto-Discovery từ Metadata)

```typescript
// apps/web/src/components/layout/sidebar.tsx
export function Sidebar() {
  const { pages, loading } = usePages(); // Auto-discover từ metadata

  if (loading) return <Loading />;

  return (
    <nav>
      {pages.map((page) => {
        // Dynamic permission check từ metadata
        const canAccess = page.permission
          ? useCanAccess(
              page.permission.split(':')[0],
              page.permission.split(':')[1]
            )
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

### 4.3 Phân Tích: Có Phải Hardcode Permission?

**Câu trả lời:** CÓ và KHÔNG, tùy vào cách hiểu:

#### A. Permission Name trong Metadata (CÓ Hardcode)

```typescript
export const pageMetadata = {
  permission: "view:User", // ⚠️ Hardcode permission name
};
```

**Lý do:**

- Permission name phải match với DB
- Metadata định nghĩa page cần permission nào
- Đây là **declaration**, không phải **assignment**

**So sánh:**

- Giống như import statement: `import { User } from "./types"`
- Bạn phải biết tên, nhưng không phải tạo nó

#### B. Permission Assignment (KHÔNG Hardcode)

```typescript
// Permission assignment vẫn qua UI
// Admin chọn role → assign "view:User" permission
// KHÔNG hardcode trong code
```

#### C. Permission Check (KHÔNG Hardcode)

```typescript
// PageGuard tự động check từ metadata
// KHÔNG cần hardcode trong mỗi page
```

### 4.4 So Sánh với Database-Driven

| Aspect                    | Database-Driven       | Metadata-Based            |
| ------------------------- | --------------------- | ------------------------- |
| **Permission Name**       | Trong DB (Page table) | Trong Code (metadata)     |
| **Permission Assignment** | Qua UI                | Qua UI (giống nhau)       |
| **Permission Check**      | Dynamic từ DB         | Dynamic từ metadata       |
| **Module List**           | Trong DB              | Validate với DB           |
| **Navigation**            | Từ DB                 | Auto-discover từ metadata |

**Kết luận:**

- Metadata-Based vẫn có hardcode permission **name** trong metadata
- Nhưng **assignment** và **check** đều không hardcode
- Database-Driven không hardcode gì cả (tất cả trong DB)

---

## 5. Phương Án 3: Hybrid (Metadata + DB Config)

### 5.1 Flow Phân Quyền

```
1. Permission Definition (DB)
   └─ Permission table: { name: "view:User", description: "..." }
   └─ Tạo qua Admin UI hoặc auto-generate

2. Permission Assignment (DB)
   └─ RolePermission table: { roleId, permissionId }
   └─ Admin assign permission cho role qua UI

3. Page Metadata (Code) - Source of Truth
   └─ pageMetadata = { path: "/dashboard/users", module: "User", permission: "view:User" }
   └─ Định nghĩa trong page component

4. Page Config (DB) - Optional Override
   └─ PageConfig table: { path: "/dashboard/users", order: 10, icon: "Users2" }
   └─ Admin có thể override order, icon, visibility qua UI
   └─ Nếu không có → dùng metadata

5. Ability Creation (Backend)
   └─ Giống như Metadata-Based

6. Permission Check (Frontend)
   └─ Giống như Metadata-Based
```

### 5.2 Phân Tích

**Permission Name:**

- ⚠️ **Hardcode trong metadata** (source of truth)
- ✅ **Có thể override trong DB** (optional)

**Permission Assignment:**

- ✅ **KHÔNG hardcode** - Qua UI

**Permission Check:**

- ✅ **KHÔNG hardcode** - Dynamic

---

## 6. So Sánh Chi Tiết: Hardcode Permission

### 6.1 Bảng So Sánh

| Aspect                          | Hardcode (Hiện tại)        | DB-Driven              | Metadata-Based             | Hybrid                         |
| ------------------------------- | -------------------------- | ---------------------- | -------------------------- | ------------------------------ |
| **Permission Name trong Code**  | ❌ Hardcode trong page     | ✅ Không (trong DB)    | ⚠️ Hardcode trong metadata | ⚠️ Hardcode trong metadata     |
| **Permission Assignment**       | ✅ Qua UI                  | ✅ Qua UI              | ✅ Qua UI                  | ✅ Qua UI                      |
| **Permission Check trong Page** | ❌ Hardcode `useCanAccess` | ✅ Dynamic (PageGuard) | ✅ Dynamic (PageGuard)     | ✅ Dynamic (PageGuard)         |
| **Module List**                 | ❌ Hardcode array          | ✅ Trong DB            | ✅ Validate với DB         | ✅ Validate với DB             |
| **Navigation Items**            | ❌ Hardcode array          | ✅ Từ DB               | ✅ Auto-discover           | ✅ Auto-discover + DB override |

### 6.2 Phân Loại Hardcode

#### A. Hardcode Permission Name (Declaration)

**Metadata-Based:**

```typescript
export const pageMetadata = {
  permission: "view:User", // ⚠️ Hardcode name
};
```

**Database-Driven:**

```typescript
// DB record
{ path: "/dashboard/users", permission: "view:User" } // ⚠️ Hardcode name (trong DB)
```

**Kết luận:** Cả hai đều phải "hardcode" permission name ở đâu đó. Đây là **declaration**, không phải **assignment**.

#### B. Hardcode Permission Check (Logic)

**Hiện tại:**

```typescript
const canAccess = useCanAccess("view", "User"); // ❌ Hardcode check
if (!canAccess) return <AccessDenied />;
```

**Metadata-Based / Database-Driven:**

```typescript
// PageGuard tự động check
// ✅ KHÔNG hardcode check logic
```

#### C. Hardcode Permission Assignment

**Tất cả phương án:**

```typescript
// ✅ KHÔNG hardcode assignment
// Tất cả đều qua UI
```

---

## 7. Giải Pháp: Loại Bỏ Hardcode Permission Name

### 7.1 Vấn Đề

Cả Metadata-Based và Database-Driven đều phải "hardcode" permission name ở đâu đó:

- Metadata-Based: trong code
- Database-Driven: trong DB

### 7.2 Giải Pháp: Auto-Generate Permission Name

#### A. Từ Module Name

```typescript
// Metadata chỉ cần module
export const pageMetadata = {
  path: "/dashboard/users",
  module: "User", // Chỉ cần module
  // permission: "view:User" // ❌ KHÔNG CẦN hardcode
};

// System tự động generate permission name
const permissionName = `view:${metadata.module}`; // "view:User"
```

#### B. Từ Action + Module

```typescript
// Metadata định nghĩa action
export const pageMetadata = {
  path: "/dashboard/users",
  module: "User",
  action: "view", // Default action cho page
  // permission: "view:User" // ❌ KHÔNG CẦN hardcode
};

// System tự động generate
const permissionName = `${metadata.action}:${metadata.module}`; // "view:User"
```

### 7.3 Code Example (Improved Metadata-Based)

```typescript
// apps/web/src/app/[locale]/dashboard/users/page.tsx
"use client";

import { PageGuard } from "@/components/page-guard";

// Metadata - KHÔNG hardcode permission name
export const pageMetadata = {
  path: "/dashboard/users",
  name: "User Management",
  module: "User", // Chỉ cần module name
  action: "view", // Default action (optional, default = "view")
  icon: "Users",
  order: 5,
};

export default function UsersPage() {
  return (
    <PageGuard metadata={pageMetadata}>
      {/* Page content */}
    </PageGuard>
  );
}
```

```typescript
// apps/web/src/components/page-guard.tsx
export function PageGuard({ metadata, children }: {
  metadata: PageMetadata,
  children: ReactNode
}) {
  // Auto-generate permission name
  const action = metadata.action || "view";
  const permissionName = `${action}:${metadata.module}`;

  // Dynamic check
  const canAccess = useCanAccess(action, metadata.module);

  if (!canAccess) return <AccessDenied />;

  return <>{children}</>;
}
```

### 7.4 Lợi Ích

- ✅ **Không hardcode permission name** - Chỉ cần module + action
- ✅ **Type-safe** - Module name có thể validate với DB
- ✅ **Consistent** - Permission naming convention tự động
- ✅ **Flexible** - Có thể override action nếu cần

---

## 8. Recommendation: Metadata-Based với Auto-Generate Permission

### 8.1 Workflow

```
1. Developer tạo page với metadata
   └─ Chỉ cần: module, action (optional)
   └─ KHÔNG cần: permission name

2. System auto-generate permission name
   └─ `${action}:${module}` → "view:User"

3. System validate permission exists in DB
   └─ Check Permission table có "view:User" không
   └─ Nếu không → suggest tạo hoặc auto-create

4. Admin assign permission to roles
   └─ Qua UI (không thay đổi)

5. Permission check tự động
   └─ PageGuard tự động check
```

### 8.2 Code Example

```typescript
// Page metadata - MINIMAL
export const pageMetadata = {
  path: "/dashboard/users",
  module: "User", // Chỉ cần module
  // action: "view" // Optional, default = "view"
};

// System tự động:
// 1. Generate permission: "view:User"
// 2. Validate với DB
// 3. Check permission
```

---

## 9. So Sánh Final

| Aspect                    | DB-Driven          | Metadata-Based (Original) | Metadata-Based (Improved)  |
| ------------------------- | ------------------ | ------------------------- | -------------------------- |
| **Permission Name**       | Trong DB           | Hardcode trong metadata   | ✅ Auto-generate từ module |
| **Permission Assignment** | Qua UI             | Qua UI                    | Qua UI                     |
| **Permission Check**      | Dynamic            | Dynamic                   | Dynamic                    |
| **Type-safe**             | ❌                 | ✅                        | ✅                         |
| **Hardcode Level**        | Low (chỉ trong DB) | Medium (metadata)         | ✅ Minimal (chỉ module)    |

---

## 10. Conclusion

### 10.1 Trả Lời Câu Hỏi

**1. Metadata-Based có phải hardcode permission không?**

**Câu trả lời:**

- **Có** (nếu hardcode permission name trong metadata)
- **Không** (nếu chỉ hardcode module, auto-generate permission name)

**2. Cách phân quyền ở các phương án:**

| Phương án                     | Permission Name       | Permission Assignment | Permission Check       |
| ----------------------------- | --------------------- | --------------------- | ---------------------- |
| **Hardcode (Hiện tại)**       | Trong seed/DB         | Qua UI                | ❌ Hardcode trong page |
| **Database-Driven**           | Trong DB (Page table) | Qua UI                | ✅ Dynamic (PageGuard) |
| **Metadata-Based (Original)** | ⚠️ Trong metadata     | Qua UI                | ✅ Dynamic (PageGuard) |
| **Metadata-Based (Improved)** | ✅ Auto-generate      | Qua UI                | ✅ Dynamic (PageGuard) |

### 10.2 Khuyến Nghị

**Metadata-Based với Auto-Generate Permission:**

- ✅ **Không hardcode permission name** - Chỉ cần module
- ✅ **Type-safe** - Metadata trong code
- ✅ **Auto-discovery** - Sidebar tự động render
- ✅ **Minimal** - Chỉ cần module name trong metadata
- ✅ **Flexible** - Có thể override action nếu cần

**Workflow:**

```
1. Developer: metadata = { module: "User" } (1 dòng)
2. System: auto-generate "view:User"
3. Admin: assign permission qua UI
4. ✅ XONG!
```
