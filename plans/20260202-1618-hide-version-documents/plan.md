## Overview

- **Goal**: Ẩn các bản ghi `Document` được tạo từ file phiên bản (`versions/`) khỏi danh sách tài liệu chính sau khi upload, đồng thời ngăn đồng bộ tạo thêm bản ghi Document cho các file version mới.
- **Scope**: Backend `apps/api` (DocumentService.findAll, DocumentSyncHandler.syncDocument), unit tests; frontend chỉ dùng API hiện có nên không cần đổi.

## Phases

1. **Backend filtering**
   - Thêm filter loại trừ các folder `path` chứa `/versions/` trong `DocumentService.findAll`.
   - Đảm bảo mọi tổ hợp filter (status, department, level) vẫn hoạt động.
   - Cập nhật unit tests `document.service.spec.ts`.

2. **Sync handler safeguards**
   - Cập nhật `DocumentSyncHandler.syncDocument` để bỏ qua các file nằm trong đường dẫn có `/versions/`.
   - Bảo toàn hành vi sync cho các file tài liệu gốc ngoài cây `versions/`.
   - Thêm unit tests mới cho handler để kiểm tra skip logic.

3. **Verification**
   - Chạy build/type-check cho API.
   - Chạy test suite liên quan (`apps/api` storage tests).
   - Kiểm tra thủ công luồng upload: sau upload chỉ còn 1 dòng tài liệu chính trong dashboard.
