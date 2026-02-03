# Decisions & requirements (locked)

**Plan:** 20260203-0736-department-folders-auto-create-upload  
**Source:** User clarification (plan/cro input)

## 1. Option A – Phase 01 backend

- **Decision:** Use **Option A**: ensure folder structure **inside** `getTree(departmentId?)` when `departmentId` is provided. No new endpoint. One round-trip; transparent to frontend.
- **Implementation:** In `FolderService.getTree()`, when `departmentId` is set, call `ensureDepartmentFolderStructure(departmentId)` once at start (try/catch, log on failure, still return tree). Then build tree as today.

## 2. Everyone (including admin) selects department for upload; admin view unchanged

- **Upload:** Mọi người (kể cả admin) đều **chọn department** khi upload từ trang ISO documents. Upload luôn vào **folder Documents** (ISO_documents) của department đã chọn.
- **View:** Admin vẫn có quyền **xem** files như logic hiện tại (xem được tài liệu từ mọi folder, mọi department). Không thay đổi permission xem/tải/approve.
- **Summary:** Upload flow = chọn department → upload vào Documents của department đó. View/list permission = giữ nguyên (admin xem toàn bộ).

## 3. List shows all folders; only upload is restricted to Documents

- **List / browse:** Vẫn **hiển thị** files trong **toàn bộ** các thư mục (document list, filters, department filter, etc. như hiện tại). Không giới hạn danh sách tài liệu theo folder.
- **Upload (ISO documents page):** Chỉ khi **upload** từ trang ISO documents thì mới **chỉ** upload vào thư mục **Documents** của department tương ứng (đã chọn).
- **Summary:** List = all folders/documents. Upload = Documents folder of selected department only.

## Checklist for implementation

- [ ] Phase 01: Option A only (ensure inside getTree).
- [ ] Phase 02: Admin cũng chọn department khi upload; picker chỉ cho chọn Documents folder của department đã chọn; không đổi quyền xem (admin vẫn xem tất cả).
- [ ] Document list API và UI: không đổi (vẫn hiển thị documents từ mọi folder theo filter hiện tại).
- [ ] Chỉ luồng upload trên trang ISO documents: bắt buộc chọn department → upload vào folder Documents của department đó.
