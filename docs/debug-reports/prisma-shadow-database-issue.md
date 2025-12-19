# Debug Report: Prisma Shadow Database & PowerShell Syntax Issues

**Date:** 2024-12-19  
**Issue:** Migration shadow database error và PowerShell syntax error

---

## Problem Summary

**Symptom 1: Shadow Database Error**

```
Error: P3006
Migration `20241219_add_folder_deleted_at` failed to apply cleanly to the shadow database.
Error code: P1014
The underlying table for model `folders` does not exist.
```

**Symptom 2: PowerShell Syntax Error**

```
ParserError: Missing file specification after redirection operator.
<<< không hoạt động trong PowerShell (bash syntax)
```

**Expected Behavior:**

- Migration apply thành công
- SQL command chạy được trong PowerShell

**Actual Behavior:**

- Shadow database không có table `folders`
- PowerShell không hỗ trợ `<<<` operator

---

## Root Cause Analysis

### 5 Whys Investigation

1. **Why shadow database error?**
   - Prisma migrate dev tạo shadow database để test migration
   - Shadow database không có schema (empty)

2. **Why shadow database empty?**
   - Shadow database được tạo mới mỗi lần migrate dev
   - Cần apply tất cả migrations từ đầu

3. **Why migration fail?**
   - Migration chỉ add column, không tạo table
   - Shadow database chưa có table `folders` → fail

4. **Why PowerShell syntax error?**
   - `<<<` là bash heredoc syntax
   - PowerShell không hỗ trợ `<<<`
   - Cần dùng PowerShell syntax khác

5. **Why need shadow database?**
   - Prisma migrate dev dùng shadow database để validate migrations
   - Đảm bảo migrations có thể apply cleanly

---

## Root Cause

**Primary Issue:**

- Shadow database không có table `folders` → migration fail
- Migration chỉ add column, không tạo table

**Secondary Issue:**

- PowerShell không hỗ trợ bash `<<<` syntax

---

## Fix Plan

### Solution 1: Disable Shadow Database (Quick Fix)

**Option A: Set shadowDatabaseUrl to empty**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL") // Set to empty or same as DATABASE_URL
}
```

**Option B: Use migrate deploy instead**

```bash
# migrate deploy không dùng shadow database
npx prisma migrate deploy
```

### Solution 2: Apply SQL Directly (Recommended)

**PowerShell syntax (not bash):**

```powershell
# Option 1: Use echo with pipe
echo "ALTER TABLE folders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3); CREATE INDEX IF NOT EXISTS folders_deleted_at_idx ON folders(deleted_at);" | npx prisma db execute --stdin --schema prisma/schema.prisma

# Option 2: Use here-string
@"
ALTER TABLE folders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS folders_deleted_at_idx ON folders(deleted_at);
"@ | npx prisma db execute --stdin --schema prisma/schema.prisma

# Option 3: Use file
# Create temp file
$sql = "ALTER TABLE folders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3); CREATE INDEX IF NOT EXISTS folders_deleted_at_idx ON folders(deleted_at);"
$sql | Out-File -FilePath temp.sql -Encoding utf8
Get-Content temp.sql | npx prisma db execute --stdin --schema prisma/schema.prisma
Remove-Item temp.sql
```

### Solution 3: Use Prisma Studio hoặc psql

**Direct database connection:**

```bash
# Connect to database và run SQL
psql -h 10.0.60.238 -p 6432 -U your_user -d documents

# Then run:
ALTER TABLE folders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS folders_deleted_at_idx ON folders(deleted_at);
```

---

## Immediate Actions

1. ✅ **Migration marked as applied** - Đã done (từ logs)
2. ✅ **Apply SQL to database** - Đã apply thành công
3. ✅ **Verify** - Migration status: "Database schema is up to date!"

---

## Recommended Fix

**Vì migration đã được marked as applied, chỉ cần apply SQL:**

```powershell
cd apps/api

# PowerShell syntax
echo "ALTER TABLE folders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3); CREATE INDEX IF NOT EXISTS folders_deleted_at_idx ON folders(deleted_at);" | npx prisma db execute --stdin --schema prisma/schema.prisma
```

**Hoặc dùng Prisma Studio hoặc psql để run SQL trực tiếp.**

---

## Verification

```bash
# Check migration status
npx prisma migrate status
# Should show: "Database schema is up to date"

# Verify column exists (via Prisma Studio hoặc psql)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'folders' AND column_name = 'deleted_at';
```

---

## Notes

- **Shadow database:** Prisma migrate dev tạo temporary database để test
- **PowerShell:** Không hỗ trợ bash `<<<`, cần dùng pipe `|` hoặc here-string
- **Migration marked:** Đã được marked as applied, chỉ cần apply SQL
