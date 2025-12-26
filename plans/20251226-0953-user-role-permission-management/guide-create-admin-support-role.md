# Hướng Dẫn: Tạo Role "Admin Support" với Quyền Documents Đầy Đủ

**Ngày:** 2025-12-26  
**Mục tiêu:** Tạo role "admin support" có toàn bộ quyền documents nhưng chỉ xem được 3 tab: Documents, KPI, và Maintenance

---

## Phân Tích Yêu Cầu

### Yêu Cầu:

1. ✅ **Toàn bộ quyền documents**: view, download, print, edit, create, delete, manage
2. ✅ **Chỉ xem được 3 tab**: Documents, KPI, Maintenance
3. ❌ **Không xem được**: Users, Departments, Permissions

### Khả Năng Hệ Thống Hiện Tại:

**✅ CÓ THỂ THỰC HIỆN** - Hệ thống phân quyền hiện tại hỗ trợ đầy đủ yêu cầu này.

#### Cơ Chế Phân Quyền:

1. **Document Permissions (Resource-level)**:
   - `view`, `download`, `print`, `edit`, `create`, `delete`, `manage`
   - Được gán ở **folder level** hoặc **document level**
   - Kiểm tra qua CASL abilities khi truy cập documents

2. **Page-level Permissions (Module-level)**:
   - `view:User`, `view:Department`, `view:Kpi`, `view:Maintenance`, `view:Permission`
   - Kiểm tra khi truy cập các trang quản lý
   - Documents page **KHÔNG có** page-level permission (luôn accessible cho authenticated users)

#### Lưu Ý Quan Trọng:

⚠️ **Documents Permissions phải được gán ở folder/document level**, không thể gán "toàn bộ quyền" ở role level mà không chỉ định folder/document cụ thể.

**Giải pháp:**

- Gán permissions cho **tất cả folders** hiện có và tương lai
- Hoặc gán permissions cho **từng folder/document cụ thể** qua UI

---

## Hướng Dẫn Sử Dụng UI

### Bước 1: Tạo Role "Admin Support"

1. **Đăng nhập** với tài khoản có role `admin`
2. **Truy cập** trang Permissions: `/dashboard/permissions`
3. **Tìm section "Roles"** (phần quản lý roles)
4. **Click nút "Add Role"** hoặc "Create Role" (biểu tượng `+`)
5. **Điền thông tin:**
   ```
   Name: admin-support
   Description: Admin support role with full document permissions and limited page access
   ```
6. **Click "Save"** hoặc "Create"

### Bước 2: Gán Document Permissions cho Role

**Lưu ý:** Document permissions được gán ở **folder level**, không phải role level trực tiếp.

Có 2 cách:

#### Cách 1: Gán Permissions cho Tất Cả Folders (Khuyến nghị)

1. **Truy cập** trang Documents: `/dashboard/documents`
2. **Chọn từng folder** trong folder tree
3. **Với mỗi folder:**
   - Click vào folder để chọn
   - Mở dialog "Folder Permissions" hoặc "Manage Permissions"
   - Tìm section "Role Permissions"
   - Chọn role `admin-support`
   - **Chọn tất cả permissions:**
     - ✅ view
     - ✅ download
     - ✅ print
     - ✅ edit
     - ✅ create
     - ✅ delete
     - ✅ manage
   - **Bật "Inherit to documents"** (nếu có) để áp dụng cho tất cả documents trong folder
   - Click "Save"

**Lặp lại** cho tất cả folders hiện có.

#### Cách 2: Gán Permissions qua API (Nếu có UI batch operation)

Nếu UI hỗ trợ batch operation:

1. Chọn nhiều folders cùng lúc
2. Gán permissions cho role `admin-support` cho tất cả folders đã chọn

### Bước 3: Gán Page-level Permissions

1. **Quay lại** trang Permissions: `/dashboard/permissions`
2. **Tìm role** `admin-support` trong danh sách roles
3. **Click nút "Assign Permissions"** hoặc "Manage Permissions" (biểu tượng bánh răng hoặc shield)
4. **Trong dialog "Assign Permissions to Role":**
   - Tìm và **chọn các permissions sau:**
     - ✅ `view:Kpi` - View KPI tracking page
     - ✅ `view:Maintenance` - View maintenance notices page
   - **KHÔNG chọn:**
     - ❌ `view:User`
     - ❌ `view:Department`
     - ❌ `view:Permission`
5. **Click "Save"** hoặc "Assign"

### Bước 4: Gán Role cho User

1. **Truy cập** trang Users: `/dashboard/users`
2. **Tìm user** cần gán role `admin-support`
3. **Click nút "Assign Roles"** hoặc icon shield bên cạnh user
4. **Trong dialog "Assign Roles":**
   - Tìm và **chọn role** `admin-support`
   - Click "Save" hoặc "Assign"

### Bước 5: Kiểm Tra Kết Quả

1. **Đăng xuất** và **đăng nhập lại** với user đã gán role `admin-support`
2. **Kiểm tra Sidebar:**
   - ✅ Thấy tab: Dashboard, Documents, KPI, Maintenance, Settings
   - ❌ KHÔNG thấy: Users, Departments, Permissions
3. **Kiểm tra Documents:**
   - Truy cập `/dashboard/documents`
   - Có thể xem, download, print, edit, create, delete documents trong các folders đã gán permissions
4. **Kiểm tra KPI:**
   - Truy cập `/dashboard/kpi`
   - Có thể xem trang KPI
5. **Kiểm tra Maintenance:**
   - Truy cập `/dashboard/maintenance`
   - Có thể xem trang Maintenance
6. **Kiểm tra Access Denied:**
   - Thử truy cập `/dashboard/users` → Phải hiển thị "Access Denied"
   - Thử truy cập `/dashboard/departments` → Phải hiển thị "Access Denied"
   - Thử truy cập `/dashboard/permissions` → Phải hiển thị "Access Denied"

---

## Giải Thích Kỹ Thuật

### Tại Sao Documents Không Có Page-level Permission?

Documents page (`/dashboard/documents`) **không có** page-level permission check vì:

- Documents được bảo vệ ở **resource level** (folder/document level)
- Mỗi folder/document có permissions riêng
- User có thể truy cập page nhưng chỉ thấy/action được các documents/folders mà họ có quyền

### Cơ Chế Hoạt Động:

```typescript
// Sidebar filtering (Phase 7)
const allNavigation = [
  {
    name: "Documents",
    href: "/dashboard/documents",
    show: true, // Always accessible to authenticated users
  },
  {
    name: "KPI",
    href: "/dashboard/kpi",
    show: canViewKpi, // Requires view:Kpi permission
  },
  // ...
];

// Documents page - No permission check
export default function DocumentsPage() {
  // No useCanAccess check
  // Permissions checked at document/folder level via CASL
}

// KPI page - Has permission check
export default function KpiPage() {
  const canAccess = useCanAccess("view", "Kpi");
  if (!canAccess) return <AccessDenied />;
  // ...
}
```

### CASL Ability Structure:

```typescript
// Role "admin-support" sẽ có abilities:
{
  // Document permissions (from folder/document permissions)
  can("view", "Document", { folderId: "folder-1" }),
  can("download", "Document", { folderId: "folder-1" }),
  can("print", "Document", { folderId: "folder-1" }),
  can("edit", "Document", { folderId: "folder-1" }),
  can("create", "Document", { folderId: "folder-1" }),
  can("delete", "Document", { folderId: "folder-1" }),
  can("manage", "Document", { folderId: "folder-1" }),

  // Page-level permissions
  can("view", "Kpi"),
  can("view", "Maintenance"),

  // NO permissions for:
  // - view:User
  // - view:Department
  // - view:Permission
}
```

---

## Tự Động Hóa (Nếu Cần)

### Script để Gán Permissions cho Tất Cả Folders

Nếu có nhiều folders, có thể tạo script để tự động gán:

```typescript
// Pseudo-code (cần implement API endpoint)
async function assignPermissionsToAllFolders(roleId: string) {
  const folders = await api.get("/folders");
  const permissions = [
    "view",
    "download",
    "print",
    "edit",
    "create",
    "delete",
    "manage",
  ];

  for (const folder of folders) {
    await api.post(`/permissions/folders/${folder.id}`, {
      roleId,
      permissions,
      inherit: true, // Apply to all documents in folder
    });
  }
}
```

---

## Troubleshooting

### Vấn Đề 1: User không thấy Documents trong sidebar

**Nguyên nhân:** User chưa được authenticated hoặc chưa có role nào

**Giải pháp:** Đảm bảo user đã đăng nhập và có ít nhất 1 role

### Vấn Đề 2: User thấy Documents nhưng không thể xem/download

**Nguyên nhân:** Chưa gán folder permissions cho role

**Giải pháp:** Gán permissions cho folders theo Bước 2

### Vấn Đề 3: User vẫn thấy tab Users/Departments/Permissions

**Nguyên nhân:** User có nhiều roles, một trong số đó có quyền xem các trang này

**Giải pháp:** Kiểm tra tất cả roles của user, đảm bảo không có role nào có `view:User`, `view:Department`, `view:Permission`

### Vấn Đề 4: User không thể truy cập KPI/Maintenance

**Nguyên nhân:** Chưa gán page-level permissions

**Giải pháp:** Thực hiện lại Bước 3, đảm bảo đã gán `view:Kpi` và `view:Maintenance`

---

## Tóm Tắt Checklist

- [ ] Tạo role `admin-support`
- [ ] Gán document permissions (view, download, print, edit, create, delete, manage) cho **tất cả folders** cho role này
- [ ] Gán page-level permissions: `view:Kpi`, `view:Maintenance`
- [ ] **KHÔNG gán:** `view:User`, `view:Department`, `view:Permission`
- [ ] Gán role `admin-support` cho user
- [ ] Test với user đã gán role
- [ ] Verify sidebar chỉ hiển thị: Dashboard, Documents, KPI, Maintenance, Settings
- [ ] Verify có thể thao tác đầy đủ với documents
- [ ] Verify access denied cho Users/Departments/Permissions pages

---

## Kết Luận

✅ **Hệ thống phân quyền hiện tại HOÀN TOÀN HỖ TRỢ** yêu cầu tạo role "admin support" với:

- Toàn bộ quyền documents (qua folder/document permissions)
- Chỉ xem được 3 tab: Documents, KPI, Maintenance (qua page-level permissions)

**Lưu ý quan trọng:** Documents permissions phải được gán ở folder level, không thể gán "toàn bộ" ở role level. Cần gán permissions cho từng folder hoặc tất cả folders.
