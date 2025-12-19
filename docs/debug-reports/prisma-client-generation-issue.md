# Debug Report: Prisma Client Generation & Migration Issues

**Date:** 2024-12-19  
**Issue:** TypeScript errors về `deletedAt` field và Prisma migration error

---

## Problem Summary

**Symptom:**

1. TypeScript errors: `deletedAt` does not exist in type `FolderWhereInput`
2. Prisma migration error: `P3005 - The database schema is not empty`
3. Prisma generate error: `EPERM: operation not permitted` (file lock)

**Root Cause:**

- Dev server đang chạy → Prisma client file bị lock → không generate được
- Database đã có schema nhưng chưa có migration history → cần baseline

---

## Fix Steps

### Step 1: Stop Dev Server

**Có 3 Node processes đang chạy:**

- Process ID: 18056, 30844, 30980

**Stop dev server:**

```bash
# Trong terminal đang chạy npm run dev, nhấn Ctrl+C
# Hoặc kill processes:
taskkill /F /PID 18056
taskkill /F /PID 30844
taskkill /F /PID 30980
```

### Step 2: Generate Prisma Client

```bash
cd apps/api
npx prisma generate
```

### Step 3: Apply Database Migration

**Option A: Baseline Migration (Recommended)**

```bash
cd apps/api
# Mark migration as applied (vì database đã có schema)
npx prisma migrate resolve --applied 20241219_add_folder_deleted_at

# Then manually add column (nếu chưa có)
npx prisma db execute --stdin --schema prisma/schema.prisma <<< "ALTER TABLE folders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3); CREATE INDEX IF NOT EXISTS folders_deleted_at_idx ON folders(deleted_at);"
```

**Option B: Use Prisma Migrate Dev (Development Only)**

```bash
cd apps/api
npx prisma migrate dev --name add_folder_deleted_at
```

### Step 4: Verify

```bash
# Check TypeScript
npm run type-check

# Should pass without errors
```

---

## Quick Fix Script

```bash
# Stop dev servers
taskkill /F /IM node.exe

# Generate Prisma client
cd apps/api
npx prisma generate

# Apply migration (baseline)
npx prisma migrate resolve --applied 20241219_add_folder_deleted_at

# Add column manually
npx prisma db execute --stdin --schema prisma/schema.prisma <<< "ALTER TABLE folders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3); CREATE INDEX IF NOT EXISTS folders_deleted_at_idx ON folders(deleted_at);"

# Verify
npm run type-check
```

---

## Notes

- **File lock:** Windows không cho phép rename file đang được sử dụng
- **Migration baseline:** Cần thiết khi database đã có schema từ trước
- **TypeScript errors:** Sẽ tự disappear sau khi generate Prisma client
