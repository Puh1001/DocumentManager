## Goal

Gộp chức năng **đổi tên tài liệu** vào dialog **Chỉnh sửa metadata ISO** để user chỉ cần mở 1 dialog và bấm **Lưu** là cập nhật cả tên + ISO metadata.

## Scope

- Frontend: `IsoMetadataEditDialog` thêm input tên tài liệu + lưu rename cùng lúc với update ISO metadata.
- Frontend: bỏ luồng `RenameDocumentDialog` khỏi `DocumentList` (rename được thực hiện trong metadata dialog).
- i18n: bổ sung/điều chỉnh message cho label/validation.

## Non-goals

- Không thay đổi API backend / database schema.
- Không thay đổi logic sync file system.

## Risks / Notes

- Rename + update metadata là 2 API calls, có thể xảy ra partial update nếu call thứ 2 fail. Chọn thứ tự: rename trước để fail sớm nếu trùng tên / invalid.

## Phases

- Phase 01: Frontend logic & UI merge
- Phase 02: i18n messages
- Phase 03: Typecheck/build + tests liên quan
