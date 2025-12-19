# File Storage Architecture

**Date:** 2024-12-19  
**Status:** Current Implementation

---

## Overview

Hệ thống sử dụng **Librarian Model** - Database chỉ lưu metadata, files vẫn ở trên SMB share.

---

## Storage Model

### Database (PostgreSQL)

**CHỈ lưu metadata:**

```prisma
model Document {
  id        String   // UUID
  name      String   // Display name
  fileName  String   // Original filename
  fileType  String   // pdf, docx, xlsx, etc.
  fileSize  Int      // bytes (metadata only)
  filePath  String   // Path to file on SMB share (NOT file content!)
  checksum  String   // SHA-256 hash (for change detection)
  folderId  String
  status    DocumentStatus
  // ... timestamps
}
```

**Không lưu:**
- ❌ File content/binary data
- ❌ File trong database

**Chỉ lưu:**
- ✅ File path (string)
- ✅ File metadata (name, size, type)
- ✅ Checksum (32 bytes string)

### SMB Share (File System)

**Files được lưu trực tiếp trên SMB share:**

```
SMB Share Structure:
├── 1/
│   ├── 2025.11 BẰNG CHẤM CÔNG - MG - Copy.xlsx  ← File gốc
│   └── backblue.gif                               ← File gốc
├── 2/
│   └── ...
└── ...

Version Control Structure (khi upload qua UI):
├── 1/
│   ├── current/
│   │   └── document.xlsx  ← Current version
│   └── versions/
│       └── {documentId}/
│           ├── v001_2024-12-19_user123.xlsx
│           └── v002_2024-12-19_user456.xlsx
```

---

## Sync Process

### Current Implementation

**Khi sync existing files:**

1. **Scan file system** → List files
2. **Read file vào memory** → Tính checksum
3. **Check database** → Document đã tồn tại?
4. **Nếu chưa tồn tại:**
   - Create document record (metadata only)
   - **Create version file** → Copy file vào `versions/` folder
5. **Nếu đã tồn tại:**
   - Compare checksum
   - Nếu thay đổi → Create new version

### Issue: Unnecessary File Copying

**Vấn đề:** Khi sync existing files lần đầu, code đang:
- Đọc file vào memory (có thể nặng với files lớn)
- Copy file vào `versions/` folder (duplicate storage)

**Impact:**
- Memory usage cao khi sync nhiều files
- Disk space tăng (duplicate files)
- Sync chậm với files lớn

---

## Optimization Options

### Option 1: Lazy Version Creation (RECOMMENDED)

**Approach:** Chỉ tạo version khi file thực sự thay đổi, không tạo khi sync lần đầu.

**Implementation:**

```typescript
// Khi sync existing file lần đầu:
if (!existing) {
  // Create document record
  // Set filePath = original file path (không copy)
  // KHÔNG tạo version file
}

// Khi file thay đổi:
if (existing.checksum !== currentChecksum) {
  // Tạo version mới (copy vào versions/)
}
```

**Pros:**
- ✅ Không duplicate files khi sync
- ✅ Faster sync (không copy files)
- ✅ Less disk space

**Cons:**
- ⚠️ Version history chỉ bắt đầu từ khi có thay đổi
- ⚠️ Không có version cho initial sync

### Option 2: Stream Checksum Calculation

**Approach:** Tính checksum bằng stream thay vì đọc toàn bộ file vào memory.

**Implementation:**

```typescript
async calculateChecksum(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  
  return hash.digest('hex');
}
```

**Pros:**
- ✅ Lower memory usage
- ✅ Works với files lớn

**Cons:**
- ⚠️ Vẫn cần đọc file (nhưng không load vào memory)

### Option 3: Skip Version Creation for Sync

**Approach:** Sync chỉ tạo document records, không tạo version files. Versions chỉ được tạo khi upload qua UI hoặc file thay đổi.

**Implementation:**

```typescript
// Sync existing file:
if (!existing) {
  // Create document record
  // Set filePath = original file path
  // Skip version creation
}

// Version chỉ tạo khi:
// 1. Upload qua UI
// 2. File thay đổi (detected via checksum)
```

**Pros:**
- ✅ No duplicate files
- ✅ Fast sync
- ✅ Versions chỉ cho files được quản lý

**Cons:**
- ⚠️ Existing files không có version history

---

## Recommended Solution

### **Hybrid: Lazy Version + Stream Checksum**

1. **Sync existing files:**
   - Chỉ tạo document records
   - Set `filePath` = original file path
   - **Không tạo version files**

2. **Calculate checksum:**
   - Use stream để tính checksum (không load vào memory)

3. **Version creation:**
   - Chỉ tạo version khi:
     - Upload qua UI
     - File thay đổi (checksum khác)

4. **File path handling:**
   - Existing files: `filePath = "1/document.xlsx"` (original path)
   - Uploaded files: `filePath = "1/current/document.xlsx"` (versioned path)

---

## Current vs Optimized

### Current (Heavy)

```
Sync 100 files (10MB each):
- Read 100 files into memory = 1GB memory
- Copy 100 files to versions/ = 1GB disk
- Time: ~5-10 minutes
```

### Optimized (Light)

```
Sync 100 files (10MB each):
- Stream checksum calculation = ~50MB memory peak
- No file copying = 0GB disk
- Time: ~1-2 minutes
```

---

## Implementation Plan

1. **Modify syncDocument():**
   - Skip version creation for initial sync
   - Use stream for checksum calculation
   - Set filePath to original path

2. **Update VersionService:**
   - Only create versions for uploaded/changed files
   - Keep existing version logic for UI uploads

3. **File Path Strategy:**
   - Existing files: Keep original path
   - Uploaded files: Use versioned path structure

---

## Conclusion

**Current issue:** Sync đang copy files không cần thiết vào versions/ folder.

**Solution:** Lazy version creation - chỉ tạo version khi file thay đổi, không tạo khi sync lần đầu.

**Impact:** Giảm memory usage, disk space, và sync time đáng kể.

