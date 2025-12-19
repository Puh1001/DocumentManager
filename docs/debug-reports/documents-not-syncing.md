# Debug Report: Documents Not Syncing

**Date:** 2024-12-19  
**Issue:** Files trong folder "1" hiển thị trong Windows Explorer nhưng không hiển thị trên web

---

## Problem Summary

**Symptom:**

- Windows Explorer hiển thị 2 files trong folder "1":
  - `2025.11 BẰNG CHẤM CÔNG - MG - Copy.xlsx` (749 KB)
  - `backblue.gif` (5 KB)
- Web UI hiển thị "Không có tài liệu trong thư mục này"

**Expected Behavior:**

- Sau khi sync, files trong folder "1" phải được sync vào database và hiển thị trên web

**Actual Behavior:**

- Sync chỉ tạo folder entries trong database
- Files không được sync vào database
- Web không hiển thị documents vì database không có records

---

## Root Cause Analysis

### 5 Whys Investigation

1. **Why files không hiển thị trên web?**
   - Database không có document records cho các files

2. **Why database không có document records?**
   - `syncWithFileSystem()` chỉ sync folders, không sync files

3. **Why sync không scan files?**
   - Code chỉ xử lý `if (file.isDirectory)`, bỏ qua files

4. **Why code không xử lý files?**
   - Implementation chưa hoàn chỉnh - chỉ implement folder sync, chưa implement document sync

5. **Why chưa implement document sync?**
   - Initial implementation focus vào folder structure, documents được expect upload qua UI

---

## Evidence

### Code Evidence

**1. `syncWithFileSystem()` chỉ sync folders:**

```173:223:apps/api/src/modules/storage/services/folder.service.ts
  async syncWithFileSystem() {
    // Recursively scan SMB folder and sync with database
    const syncFolder = async (
      relativePath: string,
      parentId: string | null = null
    ) => {
      const files = await this.smbService.listDirectory(relativePath);

      for (const file of files) {
        if (file.isDirectory) {
          // Check if folder exists in database
          const existing = await (
            this.prisma as PrismaClientLike
          ).folder.findUnique({
            where: { path: file.path },
          });

          let folderId: string;

          if (!existing) {
            // Create folder in database
            const folder = await (
              this.prisma as PrismaClientLike
            ).folder.create({
              data: {
                name: file.name,
                path: file.path,
                parentId,
              },
            });
            folderId = folder.id;
          } else {
            folderId = existing.id;
            // Update parentId if it changed
            if (existing.parentId !== parentId) {
              await (this.prisma as PrismaClientLike).folder.update({
                where: { id: folderId },
                data: { parentId },
              });
            }
          }

          // Recursively sync subdirectories
          await syncFolder(file.path, folderId);
        }
      }
    };

    // Start sync from root
    await syncFolder("");
  }
```

**Problem:** Code chỉ xử lý `if (file.isDirectory)`, bỏ qua files (`!file.isDirectory`)

**2. `findById()` có include documents:**

```20:50:apps/api/src/modules/storage/services/folder.service.ts
  async findById(id: string) {
    const folder = await (
      this.prisma as PrismaClientLike
    ).folder.findUnique({
      where: { id },
      include: {
        children: true,
        documents: true,
      },
    });

    if (!folder) {
      throw new NotFoundException("Folder not found");
    }

    return folder;
  }
```

**Status:** Method này đúng, include documents. Vấn đề là documents không có trong database.

**3. Frontend expect documents:**

```62:70:apps/web/src/app/dashboard/documents/page.tsx
  const loadFolderContents = async (folderId: string) => {
    try {
      const folder = await api.get<Folder>(`/storage/folders/${folderId}`);
      setSelectedFolder(folder);
      setDocuments(folder.documents || []);
    } catch (error) {
      console.error("Failed to load folder contents:", error);
    }
  };
```

**Status:** Frontend đúng, expect `folder.documents` array từ API.

---

## Root Cause

**Primary Issue:** `syncWithFileSystem()` chỉ sync folders, không sync documents (files).

**Secondary Issues:**

- Không có logic để scan và create document records từ file system
- Documents chỉ được tạo khi upload qua UI, không được sync từ existing files

---

## Fix Plan

### Solution: Extend `syncWithFileSystem()` to sync documents

**Implementation Steps:**

1. **Modify `syncWithFileSystem()` to handle files:**
   - Trong loop, xử lý cả files (`!file.isDirectory`)
   - Check nếu file đã tồn tại trong database
   - Create document record nếu chưa có
   - Update document metadata nếu file changed

2. **Create helper method `syncDocument()`:**
   - Check if document exists by file path
   - Create document record với metadata (name, fileName, fileType, fileSize, checksum)
   - Create initial version record

3. **Handle edge cases:**
   - Skip files đã có trong database (hoặc update nếu changed)
   - Handle file type detection
   - Calculate checksum để detect changes

4. **Performance considerations:**
   - Batch operations nếu có nhiều files
   - Skip unchanged files (compare checksum)

### Code Changes Required

**File:** `apps/api/src/modules/storage/services/folder.service.ts`

**Changes:**

1. Import `DocumentService` để create documents
2. Modify `syncFolder` to handle files
3. Add `syncDocument` helper method

---

## Immediate Actions

1. ✅ **Document issue** - This report
2. ⏳ **Implement document sync** - Extend `syncWithFileSystem()`
3. ⏳ **Test sync** - Verify files appear after sync
4. ⏳ **Update documentation** - Document sync behavior

---

## Related Files

- `apps/api/src/modules/storage/services/folder.service.ts` - Main sync logic
- `apps/api/src/modules/storage/services/document.service.ts` - Document creation logic
- `apps/api/src/modules/storage/services/smb.service.ts` - File system access
- `apps/web/src/app/dashboard/documents/page.tsx` - Frontend display

---

## Notes

- Documents hiện tại chỉ được tạo khi upload qua UI
- Sync chỉ sync folder structure, không sync file contents
- Cần implement document sync để populate database từ existing files
