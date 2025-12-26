# Troubleshooting: Thiếu Page-level Permissions

**Vấn đề:** Chỉ thấy document permissions (view, download, print, edit, create, delete, manage) nhưng không thấy page-level permissions (view:User, view:Department, view:Kpi, view:Maintenance, view:Permission).

---

## Nguyên Nhân

Các page-level permissions có thể chưa được tạo trong database. Seed file có định nghĩa chúng nhưng có thể:
1. Database chưa được seed
2. Seed chạy trước khi page-level permissions được thêm vào seed file
3. Permissions đã bị xóa

---

## Giải Pháp

### Cách 1: Chạy Seed Lại (Khuyến nghị)

1. **Kiểm tra seed file** đã có page-level permissions:
   ```typescript
   // apps/api/prisma/seed.ts
   const permissions = [
     // Document permissions
     { name: "view", description: "View document content" },
     { name: "download", description: "Download document file" },
     // ...
     // Page-level permissions
     { name: "view:User", description: "View user management page" },
     { name: "view:Department", description: "View department management page" },
     { name: "view:Kpi", description: "View KPI tracking page" },
     { name: "view:Maintenance", description: "View maintenance notices page" },
     { name: "view:Permission", description: "View permission management page" },
   ];
   ```

2. **Chạy seed:**
   ```bash
   cd apps/api
   npx prisma db seed
   ```
   
   Hoặc nếu có script:
   ```bash
   npm run seed
   ```

3. **Kiểm tra lại** trang Permissions: `/dashboard/permissions`

### Cách 2: Tạo Thủ Công Qua UI

Nếu không thể chạy seed, tạo thủ công qua UI:

1. **Đăng nhập** với tài khoản admin
2. **Truy cập** `/dashboard/permissions`
3. **Click nút "Add Permission"** (biểu tượng `+`)
4. **Tạo từng permission:**

   **Permission 1:**
   - Name: `view:User`
   - Description: `View user management page`
   - Click "Save"

   **Permission 2:**
   - Name: `view:Department`
   - Description: `View department management page`
   - Click "Save"

   **Permission 3:**
   - Name: `view:Kpi`
   - Description: `View KPI tracking page`
   - Click "Save"

   **Permission 4:**
   - Name: `view:Maintenance`
   - Description: `View maintenance notices page`
   - Click "Save"

   **Permission 5:**
   - Name: `view:Permission`
   - Description: `View permission management page`
   - Click "Save"

### Cách 3: Tạo Qua API (Nếu có quyền)

Nếu có quyền truy cập API:

```bash
# Tạo view:User
curl -X POST http://localhost:3000/api/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "view:User",
    "description": "View user management page"
  }'

# Tạo view:Department
curl -X POST http://localhost:3000/api/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "view:Department",
    "description": "View department management page"
  }'

# Tạo view:Kpi
curl -X POST http://localhost:3000/api/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "view:Kpi",
    "description": "View KPI tracking page"
  }'

# Tạo view:Maintenance
curl -X POST http://localhost:3000/api/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "view:Maintenance",
    "description": "View maintenance notices page"
  }'

# Tạo view:Permission
curl -X POST http://localhost:3000/api/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "view:Permission",
    "description": "View permission management page"
  }'
```

---

## Kiểm Tra Sau Khi Tạo

1. **Refresh** trang Permissions: `/dashboard/permissions`
2. **Tìm kiếm** với từ khóa `view:` trong search box
3. **Xác nhận** thấy 5 permissions:
   - `view:User`
   - `view:Department`
   - `view:Kpi`
   - `view:Maintenance`
   - `view:Permission`

---

## Sau Khi Có Permissions

Sau khi có các page-level permissions, bạn có thể:

1. **Gán cho role** `admin-support`:
   - Chọn role `admin-support`
   - Click "Assign Permissions"
   - Chọn `view:Kpi` và `view:Maintenance`
   - Click "Save"

2. **Gán cho các roles khác** nếu cần:
   - Admin: Tất cả permissions (đã có `manage:all`)
   - Boss: Có thể gán `view:Kpi`, `view:Maintenance` nếu cần
   - Các roles khác: Gán theo nhu cầu

---

## Lưu Ý

- **Tên permission phải chính xác:** `view:User`, `view:Department`, `view:Kpi`, `view:Maintenance`, `view:Permission`
- **Phân biệt chữ hoa/thường:** `view:Kpi` (K viết hoa), không phải `view:kpi`
- **Dấu hai chấm:** Phải có dấu `:` giữa `view` và tên module

---

## Nếu Vẫn Không Thấy

1. **Kiểm tra database trực tiếp:**
   ```bash
   cd apps/api
   npx prisma studio
   ```
   Mở bảng `permissions` và kiểm tra xem có các permissions với tên `view:User`, `view:Department`, etc. không.

2. **Kiểm tra API response:**
   - Mở Developer Tools (F12)
   - Network tab
   - Tìm request `GET /api/permissions`
   - Xem response có chứa page-level permissions không

3. **Kiểm tra filter/search:**
   - Đảm bảo không có filter nào đang ẩn các permissions
   - Thử search với từ khóa `view:` hoặc để trống search box

