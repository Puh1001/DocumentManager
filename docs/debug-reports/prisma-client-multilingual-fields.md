# Debug Report: Prisma Client Multilingual Fields Missing

**Date:** 2026-01-06  
**Issue:** TypeScript errors về `nameEn`, `nameVi`, `nameZh` fields trong seed.ts  
**Status:** 🔴 Root Cause Identified

---

## Problem Summary

**Symptom:**

- TypeScript errors: `Property 'nameEn' does not exist on type Department`
- Errors at lines 666, 667, 668, 676, 692, 698 in `seed.ts`
- Prisma Client types don't include new multilingual fields

**Root Cause:**

- Prisma Client chưa được regenerate sau khi update schema
- File lock error khi generate (EPERM) - có process đang dùng Prisma client

---

## Root Cause Analysis (5 Whys)

### Why 1: Why are TypeScript errors showing?

**Answer:** Prisma Client types don't include `nameEn`, `nameVi`, `nameZh` fields.

### Why 2: Why don't Prisma Client types include these fields?

**Answer:** Prisma Client chưa được regenerate sau khi schema được update.

### Why 3: Why hasn't Prisma Client been regenerated?

**Answer:** `npx prisma generate` failed với file lock error (EPERM).

### Why 4: Why is there a file lock error?

**Answer:** Có process đang sử dụng Prisma client file (dev server, VS Code, hoặc process khác).

### Why 5: Why is a process using the file?

**Answer:** Dev server hoặc TypeScript language server đang chạy và giữ file lock.

---

## Evidence

### 1. Schema Updated ✅

```prisma
model Department {
  nameEn    String?  @map("name_en")
  nameVi    String?  @map("name_vi")
  nameZh    String?  @map("name_zh")
  // ...
}
```

### 2. Migration Applied ✅

- Migration `20260106013033_add_multilingual_department_names` đã được apply
- Database có columns `name_en`, `name_vi`, `name_zh`

### 3. Prisma Client NOT Regenerated ❌

- Error: `EPERM: operation not permitted, rename query_engine-windows.dll.node`
- File lock prevents generation

### 4. TypeScript Errors

```
Property 'nameEn' does not exist on type 'Department'
Property 'nameVi' does not exist on type 'Department'
Property 'nameZh' does not exist on type 'Department'
```

---

## Fix Plan

### Solution 1: Stop Processes & Regenerate (Recommended)

**Step 1: Stop Dev Servers**

```bash
# Stop any running npm/node processes
taskkill /F /IM node.exe
```

**Step 2: Regenerate Prisma Client**

```bash
cd apps/api
npx prisma generate
```

**Step 3: Restart TypeScript Server**

- VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
- Or restart VS Code

### Solution 2: Use Type Assertions (Temporary Workaround)

If can't stop processes, use type assertions in seed.ts:

```typescript
// Temporary workaround
const updateData = {
  name: dept.nameVi,
  nameEn: dept.nameEn,
  nameVi: dept.nameVi,
  nameZh: dept.nameZh,
} as any;

await prisma.department.update({
  where: { code: dept.code },
  data: updateData,
});
```

**⚠️ Note:** This is temporary - proper fix is regenerate Prisma Client.

### Solution 3: Use Raw SQL (Alternative)

If Prisma Client can't be regenerated, use raw SQL:

```typescript
await prisma.$executeRaw`
  UPDATE departments 
  SET name = ${dept.nameVi},
      name_en = ${dept.nameEn},
      name_vi = ${dept.nameVi},
      name_zh = ${dept.nameZh}
  WHERE code = ${dept.code}
`;
```

---

## Verification

After fix, verify:

1. **Prisma Client Generated:**

   ```bash
   cd apps/api
   npx prisma generate
   # Should show: ✔ Generated Prisma Client
   ```

2. **TypeScript Errors Gone:**
   - Check `seed.ts` - no red squiggles
   - Run: `npm run type-check` - should pass

3. **Types Available:**
   ```typescript
   const dept = await prisma.department.findFirst();
   // dept.nameEn, dept.nameVi, dept.nameZh should be available
   ```

---

## Current Status

- ✅ Schema updated with multilingual fields
- ✅ Migration applied to database
- ❌ Prisma Client NOT regenerated (file lock)
- ❌ TypeScript errors in seed.ts
- ⏳ **Action Required:** Stop processes & regenerate Prisma Client

---

## Next Steps

1. **Stop dev servers** (if running)
2. **Regenerate Prisma Client:** `cd apps/api && npx prisma generate`
3. **Restart TypeScript server** in VS Code
4. **Verify** TypeScript errors are gone
5. **Test seed script** to ensure it works
