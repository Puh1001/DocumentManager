# Debug Report: Delete chuyển file sang Delete_files nhưng file current trong ISO_documents không bị xóa

**Ngày:** 2026-02-03  
**Triệu chứng:** User xóa document "(2025)年ISO...(1).xls" (lưu trên SMB là 0f630d01-....xls). File đã được chuyển sang Delete*files (trong đó có v001*....xls), nhưng trong ISO_documents vẫn còn file 0f630d01-....xls và thư mục versions/0f630d01.../.

---

## 1. Tóm tắt vấn đề

- **Kỳ vọng:** Khi xóa document, **file current** (0f630d01....xls trong BOC*SOI/ISO_documents) và (tùy thiết kế) file version (v001*... trong versions/...) được chuyển/xóa khỏi section.
- **Thực tế:** Chỉ có **một file** xuất hiện trong Delete_files: `v001_2026-02-03T02-16-19-094Z_c38130ee.xls` (file version). File **current** `0f630d01-3061-4b1c-a6db-7cf79f536678.xls` vẫn nằm trong BOC_SOI/ISO_documents.

---

## 2. Nguyên nhân gốc (Root cause)

**Vị trí:** `apps/api/src/modules/storage/services/document-deletion.service.ts` — `executeDelete()` (khoảng dòng 675–745).

**Logic hiện tại:**

- Chỉ dùng **một** đường dẫn: `document.filePath` (dòng 678: `const oldFilePath = document.filePath`).
- Di chuyển **đúng một file** từ `oldFilePath` sang `deleteFolder.path` (rename/move).
- Không tính toán hoặc di chuyển thêm **current file** (đường dẫn chuẩn: `{sectionRoot}/{documentId}.ext`).

**Vì sao chỉ version file bị chuyển:**

- Với document đã tạo trước fix “upload ghi đè filePath” (debug 260203-document-list-duplicate), `document.filePath` có thể đang trỏ tới **file version** (ví dụ `BOC_SOI/ISO_documents/versions/0f630d01.../v001_....xls`) thay vì file current.
- `executeDelete()` chỉ move `document.filePath` → chỉ file version được chuyển sang Delete_files.
- File **current** (0f630d01....xls trong section root) không bao giờ được move vì không nằm trong `document.filePath` và code không có bước “move current file”.

**Kết luận:** Xóa document hiện tại chỉ move **một file** (theo `document.filePath`). Khi `document.filePath` trỏ vào file version thì file current trong ISO_documents không bị xóa/chuyển.

---

## 3. Bằng chứng (Evidence)

| Nguồn                           | Nội dung                                                                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cây thư mục user                | Delete*files chứa v001*....xls; ISO_documents vẫn có 0f630d01....xls và versions/0f630d01.../.                                                                                      |
| document-deletion.service.ts    | `executeDelete()` chỉ dùng `document.filePath` (dòng 678), một lần `smbService.rename(oldFilePath, newFilePath)` (dòng 715). Không gọi StoragePathBuilder hay buildCurrentFilePath. |
| Debug report 260203 (duplicate) | Document có thể có filePath = version path (legacy); file current nằm tại section root + id.ext.                                                                                    |

---

## 4. Hướng xử lý đề xuất (Fix plan — không implement trong báo cáo này)

1. **Trong `executeDelete()` (document-deletion.service.ts):**
   - Luôn xác định **current file** theo chuẩn storage:
     - Section root: `StoragePathBuilder.deriveSectionRootFromFolderPath(document.folder.path)` (cần load document kèm folder nếu chưa có).
     - Current path: `StoragePathBuilder.buildCurrentFilePath(sectionRoot, documentId, ext)` với ext lấy từ `document.fileName` hoặc `document.filePath`.
   - Nếu **current path** tồn tại trên disk và **khác** `document.filePath`:
     - Move current file vào Delete_files (tên có thể dùng `{documentId}.ext` hoặc tên unique để tránh trùng).
   - Tiếp tục move `document.filePath` vào Delete_files như hiện tại (nếu tồn tại và chưa trùng với current path).
   - Kết quả: cả file current và (nếu có) file tại `document.filePath` đều được đưa ra khỏi ISO_documents (vào Delete_files), tránh để lại file current.

2. **Dữ liệu đã lỗi:** Document có `filePath` trỏ vào version path vẫn có file current trên disk. Script một lần (hoặc chạy fix trên từng document khi delete) có thể: sửa `filePath` về current path (theo report 260203) và/hoặc đảm bảo executeDelete move cả current file.

3. **Versions folder:** Có thể quyết định thêm: khi xóa document có nên move/xóa luôn thư mục `versions/{documentId}/` hay để admin xử lý sau. Hiện tại report chỉ tập trung vào việc **file current không bị xóa**.

---

## 5. Kết luận

- **Triệu chứng:** Delete chuyển file sang Delete_files nhưng file trong ISO_documents (0f630d01....xls) vẫn còn.
- **Nguyên nhân:** `executeDelete()` chỉ move **một file** theo `document.filePath`. Khi `document.filePath` trỏ vào file version (do lỗi cũ), chỉ version file được chuyển; **current file** (section root + id.ext) không được move.
- **Fix:** Trong executeDelete, luôn xác định và move **current file** (theo StoragePathBuilder) vào Delete_files; giữ hoặc bổ sung move `document.filePath` nếu khác current path.
