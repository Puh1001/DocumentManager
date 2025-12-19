# Refactor Storage Services

**Date:** 2024-12-19  
**Status:** ✅ Completed

---

## Problem

Storage services đang trở nên quá lớn, đặc biệt:

- `folder.service.ts`: **526 lines** (vượt quá 200 lines limit)
- File lớn khó maintain, test, và understand

## Goal

Refactor services để:

- Mỗi file < 200 lines
- Single Responsibility Principle
- Dễ maintain và test
- Giữ nguyên functionality

## Strategy

### Phase 1: Analyze & Plan

- Phân tích responsibilities của `folder.service.ts`
- Xác định cách tách hợp lý
- Tạo detailed plan

### Phase 2: Extract Sync Logic

- Tách `syncWithFileSystem()` và `syncDocument()` → `folder-sync.service.ts`
- Move related helpers (calculateChecksum, getSystemUserId)

### Phase 3: Extract Utilities

- Tách `calculateChecksum()` → `checksum.util.ts` hoặc service
- Tách `getSystemUserId()` → `system-user.util.ts` hoặc service

### Phase 4: Update Dependencies

- Update imports trong controllers
- Update storage.module.ts
- Verify all dependencies

### Phase 5: Test & Verify

- Run type check
- Test sync functionality
- Verify no breaking changes

## Files to Create

1. `apps/api/src/modules/storage/services/folder-sync.service.ts`
   - `syncWithFileSystem()`
   - `syncDocument()`
   - Dependencies: SmbService, PrismaService, DocumentService, VersionService

2. `apps/api/src/modules/storage/utils/checksum.util.ts` (hoặc service)
   - `calculateChecksum()`
   - Dependencies: SmbService

3. `apps/api/src/modules/storage/utils/system-user.util.ts` (hoặc service)
   - `getSystemUserId()`
   - Dependencies: PrismaService

## Files to Modify

1. `apps/api/src/modules/storage/services/folder.service.ts`
   - Remove sync logic
   - Remove checksum calculation
   - Remove system user management
   - Keep only: CRUD, tree building, count

2. `apps/api/src/modules/storage/storage.module.ts`
   - Add new services/utilities
   - Update exports if needed

3. Controllers (if needed)
   - Update imports for sync service

## Success Criteria

- ✅ All files < 200 lines
- ✅ No functionality lost
- ✅ Type check passes
- ✅ Dependencies properly injected
- ✅ Code follows SRP
