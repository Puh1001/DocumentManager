# Hướng dẫn tạo tài khoản xem KPI toàn bộ các bộ phận

## Tổng quan

Role `kpi_viewer_all` cho phép người dùng xem tất cả KPI từ tất cả các bộ phận với quyền **read-only** (chỉ xem, không thể tạo, sửa, xóa).

## Các bước thực hiện

### Bước 1: Đảm bảo role đã được tạo trong database

Role `kpi_viewer_all` sẽ được tạo tự động khi chạy seed script. Có 3 cách để tạo role này:

#### Cách 1: Chạy seed script đầy đủ (Khuyến nghị)

```bash
cd apps/api
npx prisma db seed
```

Hoặc:

```bash
cd apps/api
npm run seed
```

#### Cách 2: Chạy script riêng để tạo role (Nhanh hơn)

Nếu chỉ muốn tạo role `kpi_viewer_all` mà không chạy toàn bộ seed:

```bash
cd apps/api
npx ts-node prisma/seeds/create-kpi-viewer-all-role.ts
```

**Lưu ý:** Script này yêu cầu các permissions `view:Kpi`, `download:Kpi`, `print:Kpi` đã tồn tại. Nếu chưa có, cần chạy seed script đầy đủ trước.

#### Cách 3: Tạo qua giao diện web hoặc API

1. **Qua giao diện web:**
   - Đăng nhập với tài khoản admin
   - Vào trang **Permissions** (hoặc **Roles** nếu có)
   - Tạo role mới với tên: `kpi_viewer_all`
   - Mô tả: "Can view all KPI records from all departments (read-only)"
   - Gán các permissions: `view:Kpi`, `download:Kpi`, `print:Kpi`

2. **Qua API:**
   ```bash
   # Tạo role
   POST /api/roles
   Authorization: Bearer <admin_token>
   Content-Type: application/json
   
   {
     "name": "kpi_viewer_all",
     "description": "Can view all KPI records from all departments (read-only)"
   }
   
   # Sau đó gán permissions (cần lấy permission IDs trước)
   POST /api/roles/{roleId}/permissions
   Authorization: Bearer <admin_token>
   Content-Type: application/json
   
   {
     "permissionIds": ["<view:Kpi_id>", "<download:Kpi_id>", "<print:Kpi_id>"]
   }
   ```

### Bước 2: Tạo user mới

Có 2 cách để tạo user:

#### Cách 1: Qua giao diện web (Khuyến nghị)

1. Đăng nhập với tài khoản admin
2. Vào trang **Users** (Quản lý người dùng)
3. Click nút **Add** (Thêm mới)
4. Điền thông tin:
   - **Username**: Tên đăng nhập (ví dụ: `kpi-viewer`)
   - **Email**: Email của người dùng
   - **Full Name**: Tên đầy đủ
   - **Password**: Mật khẩu
   - **Department**: Có thể để trống hoặc chọn bất kỳ (role này không phụ thuộc vào department)
5. Click **Save** để tạo user

#### Cách 2: Qua API

```bash
POST /api/users
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "username": "kpi-viewer",
  "email": "kpi-viewer@company.com",
  "password": "password123",
  "fullName": "KPI Viewer User"
}
```

### Bước 3: Gán role `kpi_viewer_all` cho user

#### Cách 1: Qua giao diện web (Khuyến nghị)

1. Vào trang **Users**
2. Tìm user vừa tạo
3. Click vào icon **Roles** (hoặc nút quản lý roles) ở cột Actions
4. Trong dialog quản lý roles, chọn role `kpi_viewer_all`
5. Click **Assign** để gán role
6. Click **Close** để đóng dialog

#### Cách 2: Qua API

Trước tiên, cần lấy ID của role `kpi_viewer_all`:

```bash
GET /api/roles
Authorization: Bearer <admin_token>
```

Tìm role có `name: "kpi_viewer_all"` và lấy `id`.

Sau đó gán role cho user:

```bash
POST /api/users/{userId}/roles/{roleId}
Authorization: Bearer <admin_token>
```

Ví dụ:
```bash
POST /api/users/123e4567-e89b-12d3-a456-426614174000/roles/789e0123-e89b-12d3-a456-426614174001
Authorization: Bearer <admin_token>
```

### Bước 4: Kiểm tra quyền truy cập

1. Đăng xuất khỏi tài khoản admin
2. Đăng nhập với tài khoản vừa tạo (có role `kpi_viewer_all`)
3. Vào trang **KPI Dashboard**
4. Kiểm tra:
   - ✅ Có thể xem KPI từ tất cả các bộ phận
   - ✅ Có thể download và print KPI
   - ❌ Không thể tạo, sửa, xóa KPI records
   - ❌ Không thể upload PDF attachments

## Quyền của role `kpi_viewer_all`

### ✅ Được phép:
- Xem tất cả KPI records từ tất cả các bộ phận
- Xem chi tiết KPI metrics
- Download KPI data
- Print KPI reports
- Xem KPI attachments (PDF)

### ❌ Không được phép:
- Tạo KPI records mới
- Sửa KPI records
- Xóa KPI records
- Tạo/sửa/xóa KPI metrics
- Upload KPI attachments (PDF)

## So sánh với các role khác

| Role | Quyền KPI | Quyền khác |
|------|-----------|------------|
| `admin` | Full access (tạo, sửa, xóa) | Full access toàn hệ thống |
| `boss` | Read-only (xem tất cả) | Read-only toàn hệ thống |
| `kpi_viewer_all` | Read-only (xem tất cả KPI) | Chỉ có quyền xem KPI module |
| `editor` | Chỉ xem KPI của bộ phận mình | Có thể tạo/sửa documents |

## Troubleshooting

### Vấn đề: User không thấy KPI từ các bộ phận khác

**Giải pháp:**
1. Kiểm tra user đã có role `kpi_viewer_all` chưa:
   ```bash
   GET /api/users/{userId}
   ```
   Xem trong field `roles` có `"kpi_viewer_all"` không

2. Kiểm tra role đã có permissions chưa:
   - Role phải có permissions: `view:Kpi`, `download:Kpi`, `print:Kpi`
   - Chạy lại seed script nếu cần

3. Đăng xuất và đăng nhập lại để refresh permissions

### Vấn đề: User vẫn có thể tạo/sửa KPI

**Giải pháp:**
- Đảm bảo user chỉ có role `kpi_viewer_all`, không có các role khác như `admin`, `editor`
- Kiểm tra trong CASL ability factory đã xử lý role này đúng chưa

## Lưu ý

1. Role `kpi_viewer_all` là **read-only**, không thể thực hiện các thao tác write
2. User với role này không cần phải có department cụ thể
3. Role này chỉ áp dụng cho KPI module, không ảnh hưởng đến các module khác
4. Để xem tất cả KPI, user cần có quyền truy cập module "Kpi" (được cấp tự động khi có role này)
