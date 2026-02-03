# Debug Report: Files in Delete_files folder are displayed in document list

**Ngày:** 2026-02-03  
**Triệu chứng:** Files trong thư mục Delete_files vẫn hiển thị trong danh sách documents, trong khi theo business logic thì các files này nên được ẩn đi (tương tự như version files).

---

## 1. Tóm tắt vấn đề

- **Kỳ vọng:** Files trong thư mục Delete_files không được hiển thị trong danh sách documents (tương tự như version files).
- **Thực tế:** Files trong Delete_files vẫn xuất hiện trong danh sách với status ACTIVE.

---

## 2. Nguyên nhân gốc (Root cause)

**Vị trí:** `apps/api/src/modules/storage/services/document.service.ts` — `findAll()` (khoảng dòng 107–114).

**Logic hiện tại:**

- Code chỉ filter out folders chứa `/versions/` hoặc `\versions\`:
  ```typescript
  const folderWhere: Prisma.FolderWhereInput = {
    AND: [
      { path: { not: { contains: "/versions/" } } },
      { path: { not: { contains: "\\versions\\" } } },
    ],
  };
  ```
- **Không có filter** để loại bỏ folders chứa "Delete_files" hoặc "delete files".
- `folder.service.ts` có logic `isInternalFolderForTree()` để đánh dấu Delete_files là internal folder, nhưng logic này chỉ áp dụng cho folder tree, không áp dụng cho document filtering.

**Kết luận:** `findAll()` không filter documents trong Delete_files folders, dẫn đến các files này vẫn xuất hiện trong danh sách.

---

## 3. Bằng chứng (Evidence)

| Nguồn                           | Nội dung                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| User report                     | File trong `BOC_SOI/Delete_files` vẫn hiển thị trong danh sách documents với status ACTIVE.                                                 |
| document.service.ts             | `findAll()` chỉ filter `/versions/` và `\versions\`, không filter Delete_files.                                                             |
| folder.service.ts               | `isInternalFolderForTree()` đánh dấu Delete_files là internal nhưng chỉ dùng cho tree, không dùng cho document filtering.                  |
| Business logic                  | Delete_files là admin-only archive area, files trong đó không nên hiển thị cho users trong document list (tương tự version files).        |

---

## 4. Hướng xử lý đề xuất (Fix plan)

**Trong `findAll()` (document.service.ts):**

- Thêm filter để loại bỏ folders chứa "Delete_files" hoặc "delete files" (case-insensitive, hỗ trợ cả forward slash và backslash):
  ```typescript
  const folderWhere: Prisma.FolderWhereInput = {
    AND: [
      // Exclude version folders
      { path: { not: { contains: "/versions/" } } },
      { path: { not: { contains: "\\versions\\" } } },
      // Exclude Delete_files folders
      { path: { not: { contains: "/Delete_files" } } },
      { path: { not: { contains: "\\Delete_files" } } },
      { path: { not: { contains: "/delete files" } } },
      { path: { not: { contains: "\\delete files" } } },
      { path: { not: { contains: "/Deleted files" } } },
      { path: { not: { contains: "\\Deleted files" } } },
    ],
  };
  ```
- Hoặc sử dụng regex pattern matching nếu Prisma hỗ trợ, hoặc filter case-insensitive bằng cách normalize path trước khi query.

**Kết quả:** Documents trong Delete_files folders sẽ không xuất hiện trong danh sách documents, tương tự như version files.

---

## 5. Kết luận

- **Triệu chứng:** Files trong Delete_files folder vẫn hiển thị trong document list.
- **Nguyên nhân:** `findAll()` không filter out folders chứa "Delete_files" hoặc "delete files".
- **Fix:** Thêm filter trong `findAll()` để loại bỏ documents trong Delete_files folders (tương tự như filter cho version folders).
