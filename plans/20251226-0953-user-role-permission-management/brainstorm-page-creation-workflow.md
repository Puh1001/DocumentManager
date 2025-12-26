# Brainstorm: Workflow Tạo Page Mới - Database-Driven vs Metadata-Based

**Ngày:** 2025-12-26  
**Mục tiêu:** Làm rõ workflow khi tạo page mới với phương án Database-Driven và so sánh với các phương án khác

---

## 1. Câu Hỏi Cốt Lõi

**User hỏi:**

1. Có phải lưu page vào DB không?
2. Khi tạo chức năng/page mới thì phải làm sao?

**Phân tích:**

- User lo lắng về workflow phức tạp
- Muốn hiểu rõ quy trình thực tế
- Cần so sánh với cách làm hiện tại

---

## 2. Workflow Hiện Tại (Hardcode)

### Khi Tạo Page Mới:

```
1. Tạo page component
   └─ apps/web/src/app/[locale]/dashboard/new-page/page.tsx

2. Sửa PAGE_MODULE_MAPPING (backend)
   └─ apps/api/src/modules/authorization/constants/page-module-mapping.ts
   └─ Thêm: "/dashboard/new-page": "NewModule"

3. Sửa loadModulePermissions validation (backend)
   └─ apps/api/src/modules/authorization/factories/casl-ability.factory.ts
   └─ Thêm: "NewModule" vào hardcode list

4. Sửa Subjects type (backend + frontend)
   └─ apps/api/src/modules/authorization/types/ability.types.ts
   └─ Thêm: | "NewModule"

5. Thêm permission check vào page (frontend)
   └─ const canAccess = useCanAccess("view", "NewModule");
   └─ if (!canAccess) return <AccessDenied />;

6. Thêm navigation item vào sidebar (frontend)
   └─ apps/web/src/components/layout/sidebar.tsx
   └─ Thêm: const canViewNewPage = useCanAccess("view", "NewModule");
   └─ Thêm: { name: "New Page", href: "/dashboard/new-page", show: canViewNewPage }

7. Thêm permission vào seed file
   └─ apps/api/prisma/seed.ts
   └─ Thêm: { name: "view:NewModule", description: "..." }

8. Chạy seed hoặc tạo permission thủ công qua UI
```

**Tổng cộng:** 8 bước, 7 file cần sửa, ~30 phút

---

## 3. Phương Án 1: Database-Driven (Full DB)

### Workflow Khi Tạo Page Mới:

```
1. Tạo page component
   └─ apps/web/src/app/[locale]/dashboard/new-page/page.tsx
   └─ Chỉ cần component logic, KHÔNG cần permission check

2. Tạo Module trong DB (qua Admin UI)
   └─ Name: "NewModule"
   └─ Display Name: "New Module Management"
   └─ Auto-generate permissions: view, create, edit, delete, manage

3. Tạo Page record trong DB (qua Admin UI)
   └─ Path: "/dashboard/new-page"
   └─ Name: "New Page"
   └─ Module: "NewModule"
   └─ Permission: "view:NewModule"
   └─ Icon: "NewIcon"
   └─ Order: 5

4. Assign permissions to roles (qua Admin UI)
   └─ Chọn role → Assign "view:NewModule" permission

✅ XONG! Không cần sửa code
```

**Tổng cộng:** 4 bước, 1 file code, ~5 phút

**Ưu điểm:**

- ✅ Không cần sửa code (trừ component)
- ✅ Quản lý hoàn toàn qua UI
- ✅ Sidebar tự động hiển thị
- ✅ Page protection tự động

**Nhược điểm:**

- ⚠️ Phải tạo record trong DB
- ⚠️ Cần Admin UI để quản lý
- ⚠️ Không type-safe (module name là string)

---

## 4. Phương Án 2: Metadata-Based (Code Metadata)

### Workflow Khi Tạo Page Mới:

```
1. Tạo page component với metadata
   └─ apps/web/src/app/[locale]/dashboard/new-page/page.tsx
   └─ export const pageMetadata = {
   └─   path: "/dashboard/new-page",
   └─   name: "New Page",
   └─   module: "NewModule",
   └─   icon: "NewIcon",
   └─   order: 5,
   └─   permission: "view:NewModule",
   └─ };

2. Tạo Module trong DB (qua Admin UI)
   └─ Name: "NewModule"
   └─ Auto-generate permissions

3. Assign permissions to roles (qua Admin UI)
   └─ Chọn role → Assign "view:NewModule" permission

✅ XONG! Sidebar tự động discover từ metadata
```

**Tổng cộng:** 3 bước, 1 file code (có metadata), ~5 phút

**Ưu điểm:**

- ✅ Type-safe (metadata trong code)
- ✅ Auto-discovery từ code
- ✅ Không cần tạo Page record trong DB
- ✅ Sidebar tự động render

**Nhược điểm:**

- ⚠️ Vẫn cần sửa code (metadata)
- ⚠️ Cần auto-discovery mechanism
- ⚠️ Phức tạp hơn phương án 1

---

## 5. Phương Án 3: Hybrid (Metadata + DB Config)

### Workflow Khi Tạo Page Mới:

```
1. Tạo page component với metadata
   └─ apps/web/src/app/[locale]/dashboard/new-page/page.tsx
   └─ export const pageMetadata = {
   └─   path: "/dashboard/new-page",
   └─   module: "NewModule",
   └─   permission: "view:NewModule",
   └─ };

2. Tạo Module trong DB (qua Admin UI)
   └─ Name: "NewModule"
   └─ Auto-generate permissions

3. (Optional) Tạo Page record trong DB để override config
   └─ Có thể thay đổi order, icon, visibility qua UI
   └─ Nếu không có → dùng metadata từ code

4. Assign permissions to roles (qua Admin UI)

✅ XONG! Metadata làm source of truth, DB làm config override
```

**Tổng cộng:** 3-4 bước, 1 file code, ~5 phút

**Ưu điểm:**

- ✅ Type-safe (metadata)
- ✅ Flexible (DB override)
- ✅ Best of both worlds

**Nhược điểm:**

- ⚠️ Phức tạp nhất
- ⚠️ Cần sync metadata và DB
- ⚠️ Có thể gây confusion

---

## 6. So Sánh Chi Tiết

| Tiêu chí                 | Hardcode (Hiện tại) | DB-Driven | Metadata-Based | Hybrid   |
| ------------------------ | ------------------- | --------- | -------------- | -------- |
| **Số bước**              | 8 bước              | 4 bước    | 3 bước         | 3-4 bước |
| **Số file code cần sửa** | 7 files             | 1 file    | 1 file         | 1 file   |
| **Thời gian**            | ~30 phút            | ~5 phút   | ~5 phút        | ~5 phút  |
| **Type-safe**            | ✅                  | ❌        | ✅             | ✅       |
| **Quản lý qua UI**       | ❌                  | ✅        | ⚠️ Partial     | ✅       |
| **Auto-discovery**       | ❌                  | ❌        | ✅             | ✅       |
| **Flexibility**          | ❌                  | ✅        | ⚠️ Medium      | ✅       |
| **Complexity**           | Low                 | Medium    | Medium         | High     |

---

## 7. Phân Tích Sâu Hơn

### 7.1 Database-Driven: Có Phải Lưu Page Vào DB?

**Câu trả lời:** CÓ, nhưng chỉ lưu **metadata** của page, không lưu component code.

**Lý do:**

- Component code vẫn ở trong file system (Next.js App Router)
- DB chỉ lưu: path, name, module, permission, icon, order
- DB không lưu: component logic, business logic, UI code

**Ví dụ:**

```typescript
// DB record
{
  path: "/dashboard/users",
  name: "User Management",
  module: "User",
  permission: "view:User",
  icon: "Users",
  order: 3
}

// Component code vẫn ở:
// apps/web/src/app/[locale]/dashboard/users/page.tsx
```

### 7.2 Khi Tạo Page Mới: Workflow Thực Tế

#### Scenario 1: Developer Tạo Page Mới

**Với Database-Driven:**

```
1. Developer tạo component
   └─ Viết code, logic, UI

2. Developer hoặc Admin tạo Module trong DB
   └─ Qua Admin UI hoặc API

3. Developer hoặc Admin tạo Page record trong DB
   └─ Qua Admin UI hoặc API

4. Admin assign permissions to roles
   └─ Qua Admin UI
```

**Với Metadata-Based:**

```
1. Developer tạo component với metadata
   └─ Viết code + metadata

2. Developer hoặc Admin tạo Module trong DB
   └─ Qua Admin UI hoặc API

3. System auto-discover page từ metadata
   └─ Sidebar tự động render

4. Admin assign permissions to roles
   └─ Qua Admin UI
```

#### Scenario 2: Admin Tạo Page Mới (Không Code)

**Với Database-Driven:**

```
❌ KHÔNG THỂ - Vẫn cần developer tạo component
```

**Với Metadata-Based:**

```
❌ KHÔNG THỂ - Vẫn cần developer tạo component
```

**Kết luận:** Dù phương án nào, vẫn cần developer tạo component. DB/Metadata chỉ giúp:

- Không cần hardcode permission checks
- Không cần hardcode navigation items
- Không cần hardcode page-to-module mapping

---

## 8. Đề Xuất: Phương Án Tối Ưu

### 8.1 Phương Án Đề Xuất: **Metadata-Based với DB Override (Hybrid Light)**

**Lý do:**

1. **Type-safe:** Metadata trong code → TypeScript check
2. **Auto-discovery:** Tự động phát hiện pages
3. **Flexible:** DB có thể override config (order, icon, visibility)
4. **Developer-friendly:** Metadata gần code → dễ maintain
5. **Admin-friendly:** Có thể config qua UI

### 8.2 Workflow Chi Tiết

#### A. Developer Tạo Page:

```typescript
// apps/web/src/app/[locale]/dashboard/new-page/page.tsx
"use client";

import { PageGuard } from "@/components/page-guard";

// Metadata định nghĩa page
export const pageMetadata = {
  path: "/dashboard/new-page",
  name: "New Page",
  module: "NewModule", // Subject name cho CASL
  icon: "NewIcon", // Lucide icon name
  order: 5, // Default order
  permission: "view:NewModule", // Required permission
  requiresAuth: true,
};

export default function NewPage() {
  return (
    <PageGuard metadata={pageMetadata}>
      {/* Page content */}
    </PageGuard>
  );
}
```

#### B. Auto-Discovery System:

```typescript
// apps/web/src/lib/page-registry.ts
import { pageMetadata } from "@/app/[locale]/dashboard/new-page/page";

// Build time: Collect all page metadata
export const registeredPages = [
  pageMetadata,
  // ... other pages
];

// Runtime: Fetch from API (cached)
export async function getPages() {
  // 1. Get metadata from registered pages
  // 2. Merge with DB config (if exists)
  // 3. Return merged result
}
```

#### C. Admin UI Override:

```
Admin có thể:
- Thay đổi order qua UI
- Thay đổi icon qua UI
- Enable/disable page qua UI
- Override permission qua UI (optional)

Metadata vẫn là source of truth cho:
- Path
- Module
- Default permission
```

### 8.3 Implementation Plan

#### Phase 1: Metadata System

- [ ] Define `PageMetadata` type
- [ ] Create `PageGuard` component
- [ ] Auto-discovery mechanism
- [ ] Update existing pages to use metadata

#### Phase 2: Database Schema (Optional)

- [ ] `PageConfig` model (override only)
- [ ] API endpoints for config
- [ ] Merge metadata + config logic

#### Phase 3: Dynamic Sidebar

- [ ] Fetch pages from registry
- [ ] Merge with DB config
- [ ] Render dynamically

#### Phase 4: Admin UI (Optional)

- [ ] Page config management
- [ ] Override order, icon, visibility

---

## 9. Alternative: Simplified Database-Driven

### Nếu Muốn Đơn Giản Hơn:

**Chỉ lưu Module vào DB, không lưu Page:**

```prisma
model Module {
  id          String   @id @default(uuid())
  name        String   @unique // "User", "Department", etc.
  displayName String
  isActive    Boolean  @default(true)

  // Permissions auto-generated
  permissions ModulePermission[]
}
```

**Page metadata vẫn trong code:**

```typescript
export const pageMetadata = {
  path: "/dashboard/users",
  module: "User", // Reference to Module.name in DB
  permission: "view:User",
};
```

**Workflow:**

1. Developer tạo page với metadata
2. Admin tạo Module trong DB (nếu chưa có)
3. System validate: module phải tồn tại trong DB
4. Sidebar auto-discover từ metadata

**Ưu điểm:**

- ✅ Đơn giản hơn (không cần Page model)
- ✅ Type-safe (metadata trong code)
- ✅ Auto-discovery
- ✅ Vẫn có thể quản lý modules qua UI

---

## 10. Recommendation Summary

### Phương Án Đề Xuất: **Metadata-Based (Simplified)**

**Lý do:**

1. ✅ **Đáp ứng yêu cầu:** Không cần hardcode permission checks, navigation
2. ✅ **Type-safe:** Metadata trong code → TypeScript
3. ✅ **Auto-discovery:** Sidebar tự động render
4. ✅ **KISS:** Đơn giản hơn Database-Driven full
5. ✅ **Developer-friendly:** Metadata gần code

**Workflow:**

```
1. Developer tạo page với metadata (1 file)
2. Admin tạo Module trong DB (nếu chưa có) - qua UI
3. Admin assign permissions - qua UI
4. ✅ XONG! Sidebar tự động hiển thị
```

**Không cần:**

- ❌ Lưu Page vào DB (chỉ cần Module)
- ❌ Hardcode permission checks
- ❌ Hardcode navigation items
- ❌ Hardcode page-to-module mapping

**Cần:**

- ✅ Metadata trong page component
- ✅ Module trong DB
- ✅ Auto-discovery system

---

## 11. Next Steps

1. **Review:** Review phương án với team
2. **Prototype:** Build prototype với metadata-based
3. **Validate:** Test workflow tạo page mới
4. **Decide:** Chọn phương án cuối cùng
5. **Implement:** Theo implementation plan

---

## 12. Conclusion

**Trả lời câu hỏi:**

1. **Có phải lưu page vào DB không?**
   - **Không bắt buộc.** Có 2 lựa chọn:
     - **Option A:** Chỉ lưu Module vào DB, Page metadata trong code
     - **Option B:** Lưu cả Page và Module vào DB (flexible hơn nhưng phức tạp hơn)

2. **Khi tạo page mới thì phải làm sao?**
   - **Với Metadata-Based (Recommended):**
     1. Tạo page component với metadata (1 file)
     2. Tạo Module trong DB (nếu chưa có) - qua UI
     3. Assign permissions - qua UI
     4. ✅ XONG! Sidebar tự động hiển thị

   - **Với Database-Driven:**
     1. Tạo page component (1 file)
     2. Tạo Module trong DB - qua UI
     3. Tạo Page record trong DB - qua UI
     4. Assign permissions - qua UI
     5. ✅ XONG!

**Khuyến nghị:** Metadata-Based (Simplified) - Đơn giản, type-safe, đáp ứng yêu cầu.
