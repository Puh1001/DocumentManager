# Debug Report: Upload only allowed to Documents (ISO_documents) – KPI upload bị chặn

**Date:** 260204  
**Triệu chứng:** Thông báo lỗi "Upload only allowed to Documents (ISO_documents) folder" khi upload file KPI (file KPI phải vào thư mục KPI của department, không phải ISO_documents).

## Problem Summary

- **Kỳ vọng:** Upload từ trang KPI → lưu vào thư mục KPI của department; upload từ trang Documents (ISO) → lưu vào thư mục ISO_documents.
- **Thực tế:** Backend từ chối mọi upload không nằm dưới ISO_documents, nên upload KPI (folder path `{dept}/KPI`) bị 403 với message trên.

## Root Cause

- **Vị trí:** `apps/api/src/modules/storage/services/document.service.ts` (khoảng dòng 303–312).
- **Logic hiện tại:** Kiểm tra “defence in depth” chỉ cho phép folder path chứa `/iso_documents` hoặc bằng `iso_documents`. Folder path `{dept}/KPI` không thỏa → ném `CustomException.forbidden` với message "Upload only allowed to Documents (ISO_documents) folder".
- **Luồng KPI:** `KpiAttachmentUpload` → `kpiAttachmentApi.uploadAttachment` → API `POST /kpi/records/:id/attachments` → `KpiAttachmentService.uploadAttachment` → `DocumentService.upload(folderId, ...)` với `folderId` là KPI section root (path `{dept}/KPI`). Cùng endpoint upload document nhưng với folder thuộc KPI → bị check trên chặn.

## Evidence

1. Message lỗi đúng với code: `"Upload only allowed to Documents (ISO_documents) folder"` (document.service.ts:311).
2. document.service.ts:304–307: `isUnderIsoDocuments` chỉ true khi path có `/iso_documents` hoặc `=== "iso_documents"`.
3. KpiAttachmentService (kpi-attachment.service.ts:101–116): dùng `canonicalKpiSectionRootId` (folder path `{dept}/KPI`) làm `targetFolderId` và gọi `documentService.upload(targetFolderId, ...)`.
4. storage-path.util.ts / system-architecture: Cấu trúc section gồm KPI, ISO_documents, Maintenance, Delete_files.

## Fix Plan

1. **Backend – document.service.ts**
   - Mở rộng validation: cho phép upload khi folder path nằm dưới **ISO_documents** hoặc dưới **KPI** (path chứa `/iso_documents` hoặc `/kpi`, hoặc bằng `iso_documents` / `kpi`).
   - Không cho phép upload vào Maintenance, Delete_files hay department root (chỉ cần từ chối mọi path không thuộc ISO_documents hoặc KPI).
2. **Test**
   - Sửa test "should throw when folder path is not under ISO_documents": dùng folder path **không** thuộc ISO_documents và **không** thuộc KPI (ví dụ `DEPT/Maintenance`) và kỳ vọng vẫn throw.
   - Thêm test "should allow upload when folder path is under KPI" với path `DEPT/KPI` (hoặc tương đương) và kỳ vọng upload thành công.
3. **Docs**
   - Cập nhật docs (ví dụ system-architecture / codebase-summary) nếu có mô tả “chỉ upload vào ISO_documents”: đổi thành “upload vào ISO_documents hoặc KPI tùy ngữ cảnh”.

## Verification

- Upload từ trang Documents (chọn folder dưới ISO_documents) → thành công.
- Upload từ trang KPI (folder KPI của department) → thành công, không còn lỗi "Upload only allowed to Documents (ISO_documents) folder".
- Upload vào folder Maintenance hoặc Delete_files (nếu có cách gọi) → bị từ chối.

---

## Fix Applied (260204)

- **document.service.ts:** Cho phép upload khi folder path nằm dưới ISO_documents **hoặc** KPI; message lỗi đổi thành "Upload only allowed to Documents (ISO_documents) or KPI folder".
- **document.service.spec.ts:** Đổi test "should throw when folder path is not under ISO_documents" thành "should throw when folder path is not under ISO_documents or KPI" (dùng path `DEPT/Maintenance`). Thêm test "should allow upload when folder path is under KPI".
- Tests: Đã chạy `document.service.spec.ts` (upload / ISO_documents / KPI) — pass.
