# Debug Report: Upload – "No folders available" trong Select Folder

**Triệu chứng:** Modal "Select Folder" khi upload tài liệu ISO hiển thị "No folders available", nút Select bị disable.

**Ngữ cảnh:** Trang ISO Document → Upload → chọn file → mở dialog Chọn thư mục.

---

## Root cause (phân tích)

Luồng hiện tại:

1. **Frontend (documents/page.tsx):** `FolderPickerDialog` nhận `departmentId={selectedDepartmentIdForUpload || undefined}`. Upload chỉ mở dialog khi `uploadDepartments.length > 0`; trước khi mở có set `setSelectedDepartmentIdForUpload(uploadDepartments[0]?.id ?? "")`.
2. **Frontend (folder-picker-dialog.tsx):** `loadFolders()`:
   - Nếu `documentsOnly && !departmentId` → `setFolders([])` và return (không gọi API) → hiển thị "No folders available".
   - Nếu có `departmentId` → gọi `GET /storage/folders/tree?departmentId=...` → nếu có node ISO_documents thì dùng, không thì `result = []` → "No folders available".
3. **Backend (folder.service.ts):** `getTree(departmentId)` gọi `ensureDepartmentFolderStructure(departmentId)`. Nếu ensure **throw** (department not found, SMB lỗi, …) thì catch và tiếp tục build tree từ DB. Nếu department chưa có folder nào trong DB → `findMany` trả về [] → tree = [].

**Hai nguyên nhân chính:**

| #   | Nguyên nhân                         | Mô tả                                                                                                                                                     |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | **departmentId rỗng khi mở dialog** | `selectedDepartmentIdForUpload` vẫn "" khi dialog mở (race/initial state), nên `departmentId` là undefined → loadFolders không gọi API, set folders = []. |
| B   | **Backend trả tree rỗng**           | `ensureDepartmentFolderStructure` lỗi (department không tồn tại, SMB/disk lỗi) và DB chưa có folder nào cho department đó → API trả về [].                |

---

## Evidence

- `folder-picker-dialog.tsx` L52–55: `if (documentsOnly && !departmentId) { setFolders([]); return; }`.
- `folder-picker-dialog.tsx` L66–70: khi `documentsOnly`, `result = findDocumentsFolderNode(raw) ? [...] : []`.
- `folder.service.ts` L269–279: ensure structure, catch thì vẫn build tree từ DB; L291–299: `where.departmentId = departmentId` → nếu chưa có folder thì folders = [].
- Dialog nhận `departmentId` từ state; nếu state chưa kịp cập nhật (ví dụ trước khi useEffect sync `uploadDepartments` → `selectedDepartmentIdForUpload`) thì có thể mở với departmentId rỗng.

---

## Fix plan

1. **Frontend (đã áp dụng):** Khi mở dialog, luôn truyền **effective department** cho lần mở này: `departmentId={folderPickerOpen ? (selectedDepartmentIdForUpload || uploadDepartments[0]?.id ?? "") : undefined}`. Tránh mở dialog với departmentId rỗng khi đã có `uploadDepartments`.
2. **Backend (optional):** Khi `getTree(departmentId)` sau ensure (kể cả khi ensure throw) mà `folders.length === 0` và department tồn tại, có thể log rõ hoặc trả message để UI hiển thị "Không thể tải thư mục cho phòng ban này" thay vì chỉ "No folders available".
3. **Kiểm tra thực tế:** Nếu vẫn lỗi sau fix (1): kiểm tra Network tab – request `GET /storage/folders/tree?departmentId=...` trả 200 với body `[]` hay lỗi; kiểm tra API log khi gọi `ensureDepartmentFolderStructure` (department not found / SMB error).

---

## Verification

- Mở trang ISO Document, chọn department (nếu có nhiều), bấm Upload → chọn file → dialog mở với danh sách folder (ít nhất một node "Documents" / ISO_documents). Nút Select chỉ enable khi đã chọn folder và level.
- Nếu backend không tạo được structure: dialog vẫn mở nhưng có thể hiển thị "No folders available"; khi đó cần xử lý ở backend (ensure structure hoặc báo lỗi rõ).
