# Debug Report: Sync 500 Internal Server Error

**Date:** 2024-12-19  
**Issue:** `POST /api/storage/folders/sync` returns 500 Internal Server Error

---

## Problem Summary

**Symptom:**

- Frontend: `POST http://localhost:3000/api/storage/folders/sync 500 (Internal Server Error)`
- Backend: `socket hang up` và `ECONNRESET`
- Request fails immediately

**Expected Behavior:**

- Sync should complete successfully
- Return `{ message: "Sync completed" }`

**Actual Behavior:**

- Backend crashes or times out
- Connection reset
- 500 error returned

---

## Root Cause Analysis

### 5 Whys Investigation

1. **Why 500 error?**
   - Backend throws unhandled exception during sync

2. **Why unhandled exception?**
   - `syncWithFileSystem()` không có error handling ở top level
   - Errors trong `calculateChecksum()` hoặc `syncDocument()` không được catch

3. **Why errors in calculateChecksum?**
   - Stream có thể fail nếu file không đọc được
   - No timeout protection
   - Error handling không đầy đủ

4. **Why errors in syncDocument?**
   - `calculateChecksum()` có thể throw
   - `getSystemUserId()` có thể throw nếu không có user
   - File read errors không được handle properly

5. **Why connection reset?**
   - Backend crash khi sync
   - No error handling ở controller level
   - Unhandled promise rejection

---

## Evidence

### Code Evidence

**1. Controller không có error handling:**

```75:80:apps/api/src/modules/storage/controllers/folder.controller.ts
  @Post("sync")
  @ApiOperation({ summary: "Sync folders with file system" })
  async sync() {
    await this.folderService.syncWithFileSystem();
    return { message: "Sync completed" };
  }
```

**Problem:** Nếu `syncWithFileSystem()` throw error, không có catch → 500 error

**2. syncWithFileSystem() không có top-level error handling:**

```181:237:apps/api/src/modules/storage/services/folder.service.ts
  async syncWithFileSystem() {
    const syncFolder = async (...) => {
      // ... no try-catch ở top level
    };
    await syncFolder("");
  }
```

**Problem:** Errors trong syncFolder không được catch

**3. calculateChecksum() có thể throw:**

```242:259:apps/api/src/modules/storage/services/folder.service.ts
  private async calculateChecksum(filePath: string): Promise<string> {
    const stream = await this.smbService.readFileStream(filePath);
    // ... stream.on("error") reject nhưng không có timeout
  }
```

**Problem:**

- Stream có thể hang nếu file lớn
- No timeout protection
- Error có thể không được handle đúng

**4. getSystemUserId() có thể throw:**

```265:292:apps/api/src/modules/storage/services/folder.service.ts
  private async getSystemUserId(): Promise<string> {
    // ...
    throw new Error("No user found in database. Please create a user first.");
  }
```

**Problem:** Nếu không có user, throw error → sync fails

---

## Root Cause

**Primary Issue:** Missing error handling ở multiple levels:

1. Controller level - không catch errors
2. Service level - `syncWithFileSystem()` không có try-catch
3. Stream level - `calculateChecksum()` thiếu timeout và error handling

**Secondary Issues:**

- No timeout protection cho stream operations
- getSystemUserId() throw error nếu không có user
- Errors trong sync loop không được handle properly

---

## Fix Plan

### Solution: Add Comprehensive Error Handling

**Implementation Steps:**

1. **Add error handling ở Controller:**
   - Wrap `syncWithFileSystem()` trong try-catch
   - Return proper error response

2. **Add error handling ở Service:**
   - Wrap `syncWithFileSystem()` trong try-catch
   - Wrap `syncFolder()` trong try-catch
   - Continue syncing other items nếu một item fails

3. **Improve calculateChecksum():**
   - Add timeout protection (5 minutes)
   - Better error handling
   - Proper stream cleanup

4. **Handle getSystemUserId() errors:**
   - Check if user exists trước khi sync
   - Provide better error message

### Code Changes Required

**File:** `apps/api/src/modules/storage/controllers/folder.controller.ts`

**Changes:**

- Add try-catch trong `sync()` method
- Return proper error response

**File:** `apps/api/src/modules/storage/services/folder.service.ts`

**Changes:**

- Add try-catch trong `syncWithFileSystem()`
- Add try-catch trong `syncFolder()`
- Improve `calculateChecksum()` với timeout
- Better error logging

---

## Immediate Actions

1. ✅ **Add error handling** - Controller và Service levels
2. ✅ **Add timeout protection** - Stream operations
3. ✅ **Improve error logging** - Better error messages
4. ✅ **Use HttpException** - Proper NestJS error handling
5. ✅ **Add file existence check** - Validate files before processing
6. ✅ **Cache system user ID** - Avoid repeated database queries
7. ⏳ **Test sync** - Verify errors are handled properly

---

## Related Files

- `apps/api/src/modules/storage/controllers/folder.controller.ts` - Controller error handling
- `apps/api/src/modules/storage/services/folder.service.ts` - Service error handling
- `apps/api/src/modules/storage/services/smb.service.ts` - File system access

---

## Notes

- Errors trong sync loop nên được logged nhưng không stop toàn bộ sync
- Timeout protection cần thiết cho large files
- Better error messages giúp debug dễ hơn
