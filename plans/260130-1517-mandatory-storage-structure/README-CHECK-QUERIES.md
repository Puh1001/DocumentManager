# Hướng dẫn kiểm tra cấu trúc storage hiện tại

## File SQL
`check-current-storage-structure.sql` - Chứa các query để kiểm tra cấu trúc dữ liệu hiện tại

## Cách chạy

### Option 1: Dùng psql (PostgreSQL CLI)
```bash
psql -U your_username -d your_database -f check-current-storage-structure.sql
```

### Option 2: Dùng pgAdmin hoặc DBeaver
1. Mở file `check-current-storage-structure.sql`
2. Chạy từng query hoặc chạy toàn bộ file
3. Xem kết quả

### Option 3: Dùng Prisma Studio
```bash
cd apps/api
npx prisma studio
```
Sau đó chạy query trực tiếp trong SQL editor

## Các query quan trọng

### 1. Kiểm tra folders có tên "Documents" (cần đổi thành "ISO_documents")
```sql
-- Query 1.2 trong file SQL
SELECT ... WHERE f.name = 'Documents' ...
```
**Kết quả mong đợi:** Danh sách folders cần đổi tên

### 2. Kiểm tra folders có tên "Deleted files" (cần đổi thành "Delete_files")
```sql
-- Query 1.3 trong file SQL
SELECT ... WHERE f.name LIKE '%Delete%' ...
```
**Kết quả mong đợi:** Danh sách folders cần đổi tên

### 3. Kiểm tra documents đang ở trong "current" subfolder
```sql
-- Query 2.2 trong file SQL
SELECT ... WHERE d.file_path LIKE '%/current/%' ...
```
**Kết quả mong đợi:** Danh sách documents cần di chuyển ra section root

### 4. Summary Report (Query 7.1)
Chạy query cuối cùng để xem tổng hợp:
- Số folders cần đổi tên
- Số documents cần di chuyển
- Tổng số documents active/deleted

## Giải thích kết quả

### Path patterns cần chú ý:

**Cấu trúc cũ (cần migration):**
- `{department}/Documents/current/{fileId}.ext` ❌
- `{department}/KPI/current/{fileId}.ext` ❌
- `{department}/Maintenance/current/{fileId}.ext` ❌
- `{department}/Deleted files/{fileId}.ext` ❌

**Cấu trúc mới (sau migration):**
- `{department}/ISO_documents/{fileId}.ext` ✅
- `{department}/KPI/{fileId}.ext` ✅
- `{department}/Maintenance/{fileId}.ext` ✅
- `{department}/Delete_files/{fileId}.ext` ✅
- `{department}/{section}/versions/{fileId}.ext` ✅ (cho versions)

## Checklist trước khi migration

- [ ] Chạy query 1.2: Kiểm tra folders "Documents"
- [ ] Chạy query 1.3: Kiểm tra folders "Deleted files"
- [ ] Chạy query 2.2: Kiểm tra documents trong "current" subfolder
- [ ] Chạy query 4.1: Kiểm tra cấu trúc folder theo department
- [ ] Chạy query 7.1: Xem summary report
- [ ] Backup database trước khi migration
- [ ] Test migration trên staging environment trước

## Lưu ý

1. **Backup database** trước khi chạy migration
2. Chạy các query này trên **staging/test environment** trước
3. Ghi lại kết quả để so sánh trước/sau migration
4. Một số query có thể chạy lâu nếu database lớn - chỉ lấy LIMIT nếu cần
