# Debug Report: Danh sách tài liệu hiển thị dư 1 bản ghi (1 file vật lý → 2 Document trong DB)

**Ngày:** 2026-02-03  
**Triệu chứng:** Upload 1 file, danh sách hiển thị 2 dòng; trên SMB thực tế chỉ có 1 file (lưu tên bằng id).

---

## 1. Tóm tắt vấn đề

- **API** trả về 2 document trong `data`:
  - Doc 1: `id = 0f630d01-...`, `name` = "(2025)年ISO...", `fileName` = "(2025)年ISO...(1).xls", **filePath** = `BOC_SOI/ISO_documents/versions/0f630d01.../v001_....xls` (đường dẫn **version**).
  - Doc 2: `id = 5b3e0aa6-...`, `name` = "0f630d01-...", `fileName` = "0f630d01-....xls", **filePath** = `BOC_SOI\ISO_documents\0f630d01....xls` (file **current** trong section root).
- Cùng **folderId** (BOC_SOI/ISO_documents), cùng **checksum** → cùng 1 file vật lý, nhưng 2 bản ghi Document.

---

## 2. Nguyên nhân gốc (Root cause)

Có **hai** nguồn gây ra 1 file → 2 Document:

### 2.1 Upload ghi đè `document.filePath` bằng đường dẫn version (sai)

**Vị trí:** `apps/api/src/modules/storage/services/document.service.ts` — `upload()` sau khi gọi `versionService.createVersion()`.

**Luồng đúng trong `version.service.ts` (createVersion):**

- Ghi file vào **versionPath** (versions/...) và **currentPath** (section root / `{id}.ext`).
- Cập nhật **Document**: `filePath = currentPath` (đúng — trỏ tới file “current” trên disk).

**Luồng sai trong `document.service.ts` (upload):**

- Sau `createVersion()` trả về, upload lấy `version.filePath` (đường dẫn **version**).
- Gọi `document.update({ filePath: version.filePath, ... })` → **ghi đè** `document.filePath` từ currentPath (đúng) thành versionPath (sai).

**Kết quả:** Document chính (0f630d01) có `filePath` trỏ vào file trong thư mục versions thay vì file current `BOC_SOI/ISO_documents/0f630d01....xls`. File current vẫn tồn tại trên disk nhưng không còn được “sở hữu” bởi document đó trong DB.

**Evidence:** Trong API response, doc `0f630d01` có `filePath: "BOC_SOI/ISO_documents/versions/0f630d01-.../v001_....xls"` (version), không phải current.

---

### 2.2 Sync tạo Document thứ hai vì chỉ match theo (folderId, fileName)

**Vị trí:** `apps/api/src/modules/storage/handlers/document-sync.handler.ts` — `syncDocument()`.

**Logic hiện tại:** Tìm document tồn tại **chỉ** bằng:

- `folderId` + `fileName` (tên file trên disk) + `status: ACTIVE`.

**Trên disk sau upload:** File current nằm tại `BOC_SOI/ISO_documents/0f630d01....xls` (tên file = `{documentId}.xls`).  
**Trong DB:** Document đã có có `fileName = "(2025)年ISO...(1).xls"` (tên gốc/user), không phải `"0f630d01....xls"`.

→ Sync không tìm thấy document nào có `fileName = "0f630d01....xls"` → coi là file mới → **tạo Document thứ hai** (5b3e0aa6) với `fileName = "0f630d01....xls"`.

**Kết quả:** Cùng một file vật lý (current) được đại diện bởi hai bản ghi Document; dedupe theo (folderId, fileName) không gộp được vì fileName khác nhau.

---

## 3. Bằng chứng (Evidence)

| Nguồn              | Nội dung                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| API response       | Doc 1: `filePath` chứa `/versions/`; Doc 2: `filePath` = current file `0f630d01....xls` trong ISO_documents. |
| Code upload        | `document.service.ts` dòng 350–363: `filePath: version.filePath` sau createVersion.                          |
| Code createVersion | `version.service.ts` dòng 106: Document được set `filePath: currentPath` trước khi upload ghi đè.            |
| Code sync          | `document-sync.handler.ts` dòng 86–94: `findFirst` chỉ dùng `folderId` + `fileName` (file.name từ disk).     |

---

## 4. Hướng xử lý đã implement (2026-02-03)

1. **Upload (document.service.ts):** ✅
   - Sau `createVersion()` **không** cập nhật `document.filePath` bằng `version.filePath`.
   - Sau createVersion không ghi đè `document.filePath` bằng version path; lấy path từ DB (findUnique) rồi chỉ cập nhật fileCreatedAt/fileModifiedAt từ current file.

2. **Sync (document-sync.handler.ts):** ✅
   - Trước khi tạo Document mới: nếu tên file trên disk có dạng `{uuid}.ext` (basename không có extension = UUID hợp lệ), kiểm tra đã tồn tại Document có `id = uuid` trong cùng folder (hoặc folder tương ứng). Nếu có → coi là file current của document đó: cập nhật filePath/checksum nếu cần, **không** tạo document mới.
   - Hoặc: match thêm theo “file path hiện tại” (current path chuẩn `{sectionRoot}/{documentId}.ext`) để gắn file với document đúng.

3. **Dữ liệu đã lỗi:** Có thể chạy script một lần: với các Document có `filePath` chứa `/versions/`, sửa lại `filePath` thành current path (section root + `{id}.ext`); và/hoặc merge/xóa Document trùng (ví dụ 5b3e0aa6 nếu xác nhận là bản trùng của 0f630d01).

---

## 5. Kết luận

- **Triệu chứng:** 1 file upload → 2 dòng trong danh sách.
- **Nguyên nhân:**  
  (1) Upload ghi đè `document.filePath` bằng version path thay vì giữ current path.  
  (2) Sync chỉ match theo (folderId, fileName), nên file `{id}.xls` không match với document có fileName tên user → tạo thêm một Document cho cùng file current.
- **Fix:** Sửa upload không ghi đè filePath bằng version path; sửa sync match thêm theo “file current = {documentId}.ext” (hoặc tương đương) để không tạo document trùng.
