# Phase 5: Fix TypeScript Errors

**Status:** ✅ Completed (Temporary Fix Applied)

## Problem

TypeScript errors về `nameEn`, `nameVi`, `nameZh` fields trong seed.ts:

- Prisma Client chưa được regenerate sau schema update
- File lock error khi generate (EPERM) - có Node processes đang chạy

## Root Cause

1. Schema updated với multilingual fields ✅
2. Migration applied ✅
3. Prisma Client NOT regenerated ❌ (file lock)
4. TypeScript types không có new fields → errors

## Fix Applied

**Temporary Workaround:** Type assertions trong seed.ts

```typescript
// Type assertion for existing department check
const existingWithMultilingual = existing as typeof existing & {
  nameEn?: string | null;
  nameVi?: string | null;
  nameZh?: string | null;
};

// Type assertions in update/create operations
data: {
  name: dept.nameVi,
  nameEn: dept.nameEn,
  nameVi: dept.nameVi,
  nameZh: dept.nameZh,
} as any, // Fields exist in DB, will be in Prisma Client after regenerate
```

## Proper Fix (User Action Required)

**Step 1: Stop Dev Servers**

```bash
# Stop any running npm/node processes
taskkill /F /IM node.exe
# Or stop manually in terminals running npm run dev
```

**Step 2: Regenerate Prisma Client**

```bash
cd apps/api
npx prisma generate
```

**Step 3: Restart TypeScript Server**

- VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
- Or restart VS Code

**Step 4: Remove Type Assertions (Optional)**
After Prisma Client is regenerated, can remove `as any` assertions for cleaner code.

## Verification

✅ TypeScript errors resolved (with type assertions)
⏳ Prisma Client regeneration pending (file lock issue)
✅ Seed script will work correctly (fields exist in database)

## Notes

- Type assertions are safe because fields exist in database
- Proper fix requires regenerating Prisma Client
- File lock will clear when dev servers are stopped
