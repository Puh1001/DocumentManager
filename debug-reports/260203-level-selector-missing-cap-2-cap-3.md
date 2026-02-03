# Debug: Dropdown "Cấp độ" không hiển thị Cấp 2, Cấp 3

**Date:** 2026-02-03  
**Symptom:** Trong dialog "Chọn thư mục", dropdown "Cấp độ" chỉ có "Cấp 1"; không có "Cấp 2", "Cấp 3".

---

## Root cause

**DB chỉ có 1 bản ghi trong `document_levels` (LEVEL1).** LEVEL2 và LEVEL3 chưa bao giờ được insert.

### Chi tiết

1. **Migration chỉ tạo LEVEL1**  
   File `apps/api/prisma/migrations/20260130170000_add_iso_metadata_phase01/migration.sql` chỉ insert một level:

   ```sql
   INSERT INTO "document_levels" (..., "code", ...)
   VALUES (..., 'LEVEL1', ...)
   ON CONFLICT ("code") DO NOTHING;
   ```

   Mục đích: có 1 level mặc định để backfill `level_id` cho documents cũ. Không có LEVEL2/LEVEL3 trong migration.

2. **Seed đủ 3 cấp không nằm trong seed chính**  
   File `apps/api/prisma/seeds/seed-document-levels.ts` định nghĩa đủ LEVEL1, LEVEL2, LEVEL3 (Cấp 1, Cấp 2, Cấp 3) nhưng **không được gọi** từ `prisma/seed.ts`.  
   `npm run seed` / `npx prisma db seed` chỉ chạy `prisma/seed.ts` (modules, permissions, roles, departments, folders, …), không chạy `seed-document-levels.ts`.

3. **Luồng hiển thị đúng**
   - Frontend: `LevelSelector` → `useDocumentLevels()` → `GET /storage/document-levels`
   - API: `DocumentLevelController.findAll()` → `DocumentLevelService.findAll(activeOnly)` → `prisma.documentLevel.findMany({ where: { isActive: true } })`
   - Kết quả: API trả về đúng những gì có trong DB. DB chỉ có 1 row (LEVEL1) nên dropdown chỉ có "Cấp 1".

---

## Cách xử lý (không implement tự động theo yêu cầu debug)

**Chạy seed document levels** để thêm LEVEL2 và LEVEL3:

```bash
cd apps/api
npx ts-node prisma/seeds/seed-document-levels.ts
```

Script dùng `upsert` theo `code`, nên:

- LEVEL1 đã có sẽ được update (name, sortOrder, …).
- LEVEL2, LEVEL3 chưa có sẽ được tạo mới.

Sau khi chạy xong, reload trang và mở lại dialog "Chọn thư mục" → dropdown "Cấp độ" sẽ có đủ Cấp 1, Cấp 2, Cấp 3.

---

## Đề xuất dài hạn

- Gọi `seed-document-levels` từ `prisma/seed.ts` (ví dụ: import và gọi một hàm seed document levels trong `main()` của seed.ts) để mọi lần chạy `npx prisma db seed` đều có đủ 3 cấp.
- Hoặc ghi rõ trong README / runbook: sau khi migrate, cần chạy thêm `npx ts-node prisma/seeds/seed-document-levels.ts` (hoặc thêm bước này vào script deploy/seed).

---

## Tóm tắt

| Yếu tố                  | Trạng thái                                               |
| ----------------------- | -------------------------------------------------------- |
| Migration               | Chỉ insert LEVEL1                                        |
| seed-document-levels.ts | Có đủ LEVEL1, 2, 3 nhưng không chạy khi `prisma db seed` |
| API / Frontend          | Đúng, hiển thị đúng dữ liệu từ DB                        |
| Nguyên nhân             | Thiếu dữ liệu LEVEL2, LEVEL3 trong DB                    |
