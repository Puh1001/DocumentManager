# Upload Flow - Complete Analysis & Solution

**Date:** 2025-01-23  
**Status:** ✅ SOLUTION IMPLEMENTED

---

## Current Upload Flow (Detailed)

### Step 1: Frontend - User Selects File

**Browser:** User picks file `"BPVN. Thông báo khám sức khỏe Định kỳ.pdf"`

**JavaScript File Object:**
```javascript
file.name = "BPVN. Thông báo khám sức khỏe Định kỳ.pdf"  // UTF-8 string
file.size = 12345
file.type = "application/pdf"
```

---

### Step 2: Frontend - Create FormData

**File:** `apps/web/src/lib/api.ts:353-367`

```typescript
const formData = new FormData();
formData.append("file", file);  // Browser encodes filename in Content-Disposition header
formData.append("fileName", file.name);  // ← NEW: Send as text field (UTF-8 thô)
formData.append("folderId", folderId);
formData.append("name", name);
```

**What happens:**
- `formData.append("file", file)` → Browser tạo `Content-Disposition: form-data; name="file"; filename="..."` header
- Browser có thể encode filename trong header này (quoted, escaped, hoặc RFC 5987 format)
- `formData.append("fileName", file.name)` → Gửi như text field thông thường, UTF-8 thô, không encode

---

### Step 3: Network - HTTP Request

**Request:**
```
POST /api/storage/documents/upload
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="BPVN. Thông báo khám sức khỏe Định kỳ.pdf"
Content-Type: application/pdf

[binary file data]
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="fileName"

BPVN. Thông báo khám sức khỏe Định kỳ.pdf
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="folderId"

[folderId]
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

**Vấn đề ở đây:**
- Filename trong `Content-Disposition: form-data; name="file"; filename="..."` có thể bị browser encode
- Browser có thể dùng:
  - `filename="..."` (quoted, có thể escape)
  - `filename*=UTF-8''...` (RFC 5987, URL-encoded)
  - Hoặc cả hai

---

### Step 4: Backend - Multer Parsing

**File:** Multer parses multipart/form-data

**What Multer does:**
1. Parse `Content-Disposition` header
2. Extract filename từ header
3. Decode filename → **VẤN ĐỀ: Multer decode theo Latin1 thay vì UTF-8**
4. Set `file.originalname = decoded_filename`

**Result:**
```typescript
file.originalname = "ThÃ´ng bÃ¡o..."  // Mojibake (Latin1-decoded UTF-8)
```

---

### Step 5: Backend - Interceptor Fix

**File:** `apps/api/src/common/interceptors/utf8-file.interceptor.ts:29-39`

```typescript
if (request.file && request.file.originalname) {
  const originalName = request.file.originalname;  // "ThÃ´ng bÃ¡o..."
  const fixedName = fixFileNameEncodingSimple(originalName);  // "Thông báo..."
  request.file.originalname = fixedName;  // Fix applied
}
```

**Vấn đề:**
- Fix chỉ hoạt động nếu Multer decode sai thành Latin1
- Nếu browser đã encode sai hoặc có nhiều lớp encoding → fix có thể không đúng

---

### Step 6: Backend - Controller

**File:** `apps/api/src/modules/storage/controllers/document.controller.ts:165-172`

```typescript
async upload(
  @UploadedFile() file: Express.Multer.File,  // file.originalname đã được fix
  @Body("folderId") folderId: string,
  @Body("name") name: string,
  @Body("fileName") fileName?: string,  // ← NEW: Nhận từ body (UTF-8 thô)
  @Request() req: AuthenticatedRequest
) {
  return this.documentService.upload(folderId, file, req.user.id, name, fileName);
}
```

---

### Step 7: Backend - Service

**File:** `apps/api/src/modules/storage/services/document.service.ts:98-105`

```typescript
// Ưu tiên dùng fileName từ body (gửi riêng như text field, UTF-8 thô)
// Fallback về file.originalname nếu không có (đã được fix bởi interceptor)
const sourceFileName = fileName || file.originalname;
const normalizedFileName = sourceFileName.normalize('NFC');
```

**Logic:**
- Nếu có `fileName` từ body → dùng nó (UTF-8 thô, đáng tin cậy)
- Nếu không có → dùng `file.originalname` (đã được fix bởi interceptor)

---

### Step 8: Database Storage

**PostgreSQL:**
```sql
INSERT INTO documents (file_name, name, ...) 
VALUES ('BPVN. Thông báo khám sức khỏe Định kỳ.pdf', 'BPVN. Thông báo khám sức khỏe Định kỳ', ...);
```

**Encoding:** UTF-8 (PostgreSQL hỗ trợ UTF-8)

---

## Solution: Send Filename as Text Field

### Why This Works

1. **Text fields không bị encode** - FormData text fields được gửi như UTF-8 thô
2. **Không qua Content-Disposition header** - Tránh vấn đề encoding ở header
3. **Multer parse đúng** - Text field được parse đúng UTF-8
4. **Đơn giản hơn** - Không cần fix encoding phức tạp

### Implementation

✅ **Frontend:** `apps/web/src/lib/api.ts`
- Thêm `formData.append("fileName", file.name)` trong cả `upload()` và `uploadWithProgress()`

✅ **Backend Controller:** `apps/api/src/modules/storage/controllers/document.controller.ts`
- Thêm `@Body("fileName") fileName?: string` parameter
- Pass `fileName` to service

✅ **Backend Controller:** `apps/api/src/modules/kpi/controllers/kpi-attachment.controller.ts`
- Thêm `fileName` vào body schema
- Pass `fileName` to service

✅ **Backend Service:** `apps/api/src/modules/storage/services/document.service.ts`
- Thêm `fileName?: string` parameter
- Ưu tiên dùng `fileName` từ parameter, fallback về `file.originalname`

✅ **Backend Service:** `apps/api/src/modules/kpi/services/kpi-attachment.service.ts`
- Thêm `fileName?: string` parameter
- Pass `fileName` to `documentService.upload()`

---

## Benefits

1. ✅ **Không phụ thuộc Multer encoding** - Filename gửi riêng, không qua Content-Disposition
2. ✅ **Text thô UTF-8** - Browser gửi như text field, không encode/escape
3. ✅ **Đơn giản** - Không cần fix encoding phức tạp
4. ✅ **Đáng tin cậy** - Tránh các vấn đề encoding ở nhiều lớp
5. ✅ **Backward compatible** - Vẫn fallback về `file.originalname` nếu không có `fileName`

---

## Testing

**Test Case:**
1. Upload file với tên: `"BPVN. Thông báo khám sức khỏe Định kỳ.pdf"`
2. Verify `fileName` field được gửi trong FormData
3. Verify backend nhận `fileName` từ body
4. Verify database lưu đúng UTF-8
5. Verify API response trả về đúng
6. Verify frontend hiển thị đúng

---

## Next Steps

1. ✅ Implemented - Frontend gửi `fileName` field
2. ✅ Implemented - Backend nhận `fileName` từ body
3. ✅ Implemented - Service ưu tiên dùng `fileName` parameter
4. ⏳ **Test với file upload thực tế**
5. ⏳ **Verify database storage**
6. ⏳ **Verify API response**
7. ⏳ **Verify frontend display**
