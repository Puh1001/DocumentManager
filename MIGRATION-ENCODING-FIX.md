# 🔧 Database Encoding Migration Guide

## Vấn đề (Problem)

File names trong database đang bị lỗi encoding (mojibake):
- ❌ Trong DB: `Tá»· lá»\u0087 xá»­ lÃ½`
- ✅ Đúng: `Tỷ lệ xử lý`

## Giải pháp (Solution)

1. ✅ Code đã được fix → Future uploads sẽ OK
2. 🔄 Cần chạy migration để fix data cũ trong DB

---

## Các bước thực hiện (Steps)

### Bước 1: Restart API server

```bash
# Stop current dev server (Ctrl+C in terminal 4)
# Then restart:
cd apps/api
npm run dev
```

### Bước 2: (Khuyến nghị) Backup database

```bash
# Tạo backup trước khi migration
docker exec iso-docs-postgres pg_dump -U admin documents_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Bước 3: Chạy migration script

```bash
cd apps/api
npx ts-node src/scripts/fix-filename-encoding.ts
```

**Kết quả mong đợi:**

```
🚀 Starting database encoding migration...
🔍 Scanning documents for encoding issues...

📝 Document Name Fix:
  ID: abc-123
  Before: Tá»· lá»\u0087 xá»­ lÃ½
  After:  Tỷ lệ xử lý

📊 Migration Summary:
✅ Documents Fixed:   45
⏭️  Documents Skipped: 82
❌ Errors:            0

✨ Migration complete!
```

### Bước 4: Verify trong database

```bash
# Exec vào PostgreSQL container
docker exec -it iso-docs-postgres psql -U admin -d documents_db

# Check data đã fix
SELECT id, file_name FROM documents ORDER BY created_at DESC LIMIT 10;

# Kết quả phải hiển thị đúng:
# ✅ Tỷ lệ xử lý khiếu nại nội bộ.pdf
# ✅ Số lần đề xuất cải tiến.pdf

# Thoát
\q
```

### Bước 5: Verify trong UI

1. Mở browser
2. Hard refresh: **Ctrl + Shift + R**
3. Kiểm tra Boss UI → KPI attachments
4. File names phải hiển thị đúng tiếng Việt

---

## Test sau khi migration

- [ ] Upload file mới với tên tiếng Việt → Check DB → Phải lưu đúng
- [ ] Download file → Tên file phải đúng
- [ ] Xem file trong UI → Hiển thị đúng
- [ ] Check audit logs → Không có errors

---

## Rollback (Nếu cần)

Nếu migration có vấn đề, restore từ backup:

```bash
# Stop API server first (Ctrl+C)

# Restore database
docker exec -i iso-docs-postgres psql -U admin documents_db < backup_YYYYMMDD_HHMMSS.sql

# Restart API
cd apps/api
npm run dev
```

---

## Kết quả (Expected Results)

### Trước khi fix:
```
Database: Tá»· lá»\u0087 xá»­ lÃ½ khiáº¿u náº¡i
UI:       æ<ç»Ðø¼‰æŒPeû...
```

### Sau khi fix:
```
Database: Tỷ lệ xử lý khiếu nại
UI:       Tỷ lệ xử lý khiếu nại
```

---

## Support

Nếu gặp vấn đề:
1. Check API logs trong terminal
2. Check database với query: `SELECT * FROM documents WHERE file_name LIKE '%\\%' LIMIT 5;`
3. Xem debug report: `docs/debug-reports/260121-database-encoding-corruption-fix.md`

---

**Status:** Ready to run ✅  
**Risk:** Medium 🟡 (recommend backup first)  
**Time:** ~30 seconds for 100 documents
