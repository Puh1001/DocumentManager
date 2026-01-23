# Upload Flow Analysis - Filename Encoding

**Date:** 2025-01-23  
**Status:** 🔍 ANALYSIS COMPLETE

---

## Current Upload Flow

### 1. Frontend (Next.js/React)

**File:** `apps/web/src/lib/api.ts`

```typescript
// User selects file: file.name = "BPVN. Thông báo khám sức khỏe Định kỳ.pdf"
const formData = new FormData();
formData.append("file", file);  // Browser encodes filename automatically
formData.append("folderId", folderId);
formData.append("name", name);

fetch(`${API_BASE}${endpoint}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },  // NO Content-Type header!
  body: formData,  // Browser sets Content-Type: multipart/form-data; boundary=...
});
```

**Vấn đề:**
- Browser tự động encode filename trong `Content-Disposition` header
- Encoding format: `filename="..."` hoặc `filename*=UTF-8''...` (RFC 5987)
- Browser có thể encode sai hoặc Multer decode sai

---

### 2. Network (HTTP Request)

**Request Headers:**
```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

**Request Body:**
```
------WebKitFormBoundary...
Content-Disposition: form-data; name="file"; filename="BPVN. Thông báo khám sức khỏe Định kỳ.pdf"
Content-Type: application/pdf

[file binary data]
------WebKitFormBoundary...
Content-Disposition: form-data; name="folderId"

[folderId value]
------WebKitFormBoundary...
```

**Vấn đề:**
- Filename trong `Content-Disposition` header có thể bị encode/escape
- Browser có thể dùng `filename*` (RFC 5987) hoặc `filename` (RFC 2183)
- Nếu dùng `filename` (không có `*`), filename có thể bị quoted và escape

---

### 3. Backend - Multer Parsing

**File:** `apps/api/src/common/config/multer.config.ts`

```typescript
// Multer parses multipart/form-data
// Extracts filename from Content-Disposition header
// file.originalname = decoded filename from header
```

**Vấn đề:**
- Multer đọc filename từ `Content-Disposition` header
- Multer decode theo Latin1 (ISO-8859-1) thay vì UTF-8
- Kết quả: `file.originalname` = "ThÃ´ng bÃ¡o..." (mojibake)

---

### 4. Backend - Interceptor Fix

**File:** `apps/api/src/common/interceptors/utf8-file.interceptor.ts`

```typescript
// Runs AFTER Multer processes file
if (request.file && request.file.originalname) {
  const originalName = request.file.originalname;  // Already corrupted!
  const fixedName = fixFileNameEncodingSimple(originalName);
  request.file.originalname = fixedName;  // Fix applied
}
```

**Vấn đề:**
- Fix chỉ hoạt động nếu Multer decode sai thành Latin1
- Nếu Multer decode đúng UTF-8 nhưng browser gửi sai → fix không hoạt động
- Nếu có nhiều lớp encoding → fix có thể không đúng

---

### 5. Backend - Service Layer

**File:** `apps/api/src/modules/storage/services/document.service.ts`

```typescript
async upload(folderId: string, file: Express.Multer.File, userId: string, name?: string) {
  // file.originalname đã được fix bởi interceptor
  const normalizedFileName = file.originalname.normalize('NFC');
  
  // Lưu vào database
  await prisma.document.create({
    data: {
      fileName: normalizedFileName,  // Lưu vào DB
      // ...
    }
  });
}
```

---

### 6. Database Storage

**PostgreSQL:**
- Column `file_name` type: `VARCHAR` hoặc `TEXT`
- Encoding: UTF-8
- Lưu giá trị từ `normalizedFileName`

---

## Root Cause Analysis

### Vấn đề chính:

1. **Browser → Server:**
   - Browser encode filename trong `Content-Disposition` header
   - Format có thể là: `filename="..."` (quoted, có thể escape) hoặc `filename*=UTF-8''...` (RFC 5987)
   - Nếu browser dùng `filename` (không có `*`), filename có thể bị escape/encode

2. **Multer Parsing:**
   - Multer đọc filename từ header
   - Multer decode theo Latin1 thay vì UTF-8
   - Kết quả: mojibake

3. **Fix Logic:**
   - Interceptor fix bằng cách convert Latin1→UTF8
   - Nhưng nếu browser đã encode sai hoặc Multer đã decode sai ở bước khác → fix không hoạt động

---

## Solution: Send Filename as Separate Field

**Thay vì dựa vào `file.originalname` từ Multer, gửi filename riêng:**

### Frontend Change:

```typescript
// apps/web/src/lib/api.ts
async upload<T>(endpoint: string, file: File, additionalData?: Record<string, string>) {
  const formData = new FormData();
  formData.append("file", file);
  
  // Gửi filename riêng (text thô, không encode)
  formData.append("fileName", file.name);  // ← Thêm dòng này
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  
  // ...
}
```

### Backend Change:

```typescript
// apps/api/src/modules/storage/controllers/document.controller.ts
@Post("upload")
async upload(
  @UploadedFile() file: Express.Multer.File,
  @Body("folderId") folderId: string,
  @Body("name") name: string,
  @Body("fileName") fileName?: string,  // ← Thêm field này
  @Request() req: AuthenticatedRequest
) {
  // Ưu tiên dùng fileName từ body (text thô)
  // Fallback về file.originalname nếu không có
  const finalFileName = fileName || file.originalname;
  
  return this.documentService.upload(
    folderId, 
    file, 
    req.user.id, 
    name,
    finalFileName  // ← Pass filename riêng
  );
}
```

### Service Change:

```typescript
// apps/api/src/modules/storage/services/document.service.ts
async upload(
  folderId: string,
  file: Express.Multer.File,
  userId: string,
  name?: string,
  fileName?: string  // ← Thêm parameter
) {
  // Ưu tiên dùng fileName từ parameter (đã là UTF-8 đúng)
  // Chỉ fix nếu dùng file.originalname
  const normalizedFileName = fileName 
    ? fileName.normalize('NFC')
    : fixFileNameEncodingSimple(file.originalname).normalize('NFC');
  
  // ...
}
```

---

## Benefits

1. **Không phụ thuộc Multer encoding** - Filename gửi riêng, không qua Content-Disposition header
2. **Text thô UTF-8** - Browser gửi filename như text field, không encode/escape
3. **Đơn giản hơn** - Không cần fix encoding phức tạp
4. **Đáng tin cậy hơn** - Tránh các vấn đề encoding ở nhiều lớp

---

## Implementation Plan

1. ✅ Update frontend `api.upload()` - Thêm `fileName` field
2. ✅ Update document controller - Nhận `fileName` từ body
3. ✅ Update KPI attachment controller - Nhận `fileName` từ body
4. ✅ Update document service - Ưu tiên dùng `fileName` parameter
5. ✅ Update KPI attachment service - Pass `fileName` to document service
6. ⏳ Test với file có tên tiếng Việt/Trung
7. ⏳ Verify database storage
8. ⏳ Verify API response
9. ⏳ Verify frontend display
