# Debug: Upload SOP-006 OK, SOP-007 báo "Invalid documentNo for document level"

**Ngày:** 2026-02-07  
**Triệu chứng:** Upload tài liệu SOP-006 thành công; upload SOP-007 với thông tin nhập giống hệt thì lỗi "Invalid documentNo for document level".

---

## 1. Tóm tắt vấn đề

- **Lỗi hiển thị:** "Upload Error – Invalid documentNo for document level".
- **Nơi ném lỗi:** `apps/api/src/modules/storage/services/document.service.ts` (khoảng dòng 408–412 khi upload, 804–808 khi cập nhật metadata).
- **Điều kiện:** `documentNo` được kiểm tra theo **cấp tài liệu (level)** đã chọn. Nếu format không đúng với level đó thì API ném lỗi trên.

---

## 2. Nguyên nhân gốc (Root cause)

Backend **không** có logic khác nhau cho SOP-006 và SOP-007. Với **cùng Level 3**, cả hai đều hợp lệ theo regex:

- Level 3: `^BPVN-[A-Z0-9]+-(SOP|SMP)-\d{3}$`
- `BPVN-WK-SOP-006` và `BPVN-WK-SOP-007` đều match.

Vì vậy lỗi xảy ra khi **một trong hai** điều sau sai:

### A. Sai cấp độ (Level) khi upload SOP-007

- Khi mở dialog upload lần 2, **Level mặc định là trống** (`selectedLevelId = ""`). User phải chọn Level lại.
- Nếu user **không chọn lại Level 3** (ví dụ để mặc định trống, hoặc chọn nhầm Level 1/2/4) thì:
  - **Level 1:** chỉ chấp nhận `BPVN-QESM-001` → `BPVN-WK-SOP-007` → **lỗi**.
  - **Level 2:** chỉ chấp nhận dạng `BPVN-...-QEP-xxx` → SOP → **lỗi**.
  - **Level 4:** chỉ chấp nhận dạng `BPVN-...-PR-xxx` → SOP → **lỗi**.

Kết luận: **SOP-007 đang bị kiểm tra với một level khác Level 3** (thường là do không chọn lại Level 3 ở lần upload thứ 2).

### B. Sai format Mã số (documentNo) khi nhập SOP-007

- Nếu nhập **thiếu phần đầu** (ví dụ chỉ `SOP-007` hoặc `WK-SOP-007`) thì không khớp regex Level 3 → **lỗi**.
- Level 3 yêu cầu **đủ**: `BPVN-` + mã phòng (ví dụ `WK-`) + `SOP-` hoặc `SMP-` + **đúng 3 chữ số** (006, 007, 001...).

---

## 3. Bằng chứng trong code

- **Validation theo level:**  
  `document.service.ts` (khoảng 395–412): dùng `level.code` (LEVEL1/2/3/4) để chọn regex; nếu `!valid` thì ném "Invalid documentNo for document level".
- **Regex Level 3:**  
  `const level3Regex = /^BPVN-[A-Z0-9]+-(SOP|SMP)-\d{3}$/;`  
  → 006 và 007 đều hợp lệ, không có giới hạn số thứ tự.
- **Dialog upload:**  
  `folder-picker-dialog.tsx`: `selectedLevelId` mặc định `useState("")`, sau khi đóng dialog lại reset về `""` (khoảng dòng 196) → mỗi lần mở dialog phải chọn Level lại.

---

## 4. Hướng xử lý (Fix plan)

### Bước 1: Tự kiểm tra khi upload SOP-007

1. Mở dialog upload → chọn **Level 3** (Cấp 3).
2. Mã số nhập **đủ**: `BPVN-WK-SOP-007` (hoặc đúng mã phòng của bạn thay `WK`), **không** chỉ `SOP-007`.
3. Thử upload lại. Nếu vẫn lỗi, chuyển bước 2.

### Bước 2: Cải thiện thông báo lỗi ✅ (đã làm)

- Trong `document.service.ts`, khi ném "Invalid documentNo for document level", **đã thêm** gợi ý format theo level:
  - **Upload:** dòng ~409–422 (hàm `upload`): hint theo `level.code` (LEVEL1 → BPVN-QESM-001; LEVEL2 → BPVN-(Dept)-QEP-001; LEVEL3 → BPVN-(Dept)-SOP/SMP-001 (e.g. BPVN-WK-SOP-007); LEVEL4 → BPVN-(Dept)-PR-001).
  - **Cập nhật metadata:** dòng ~816–830 (hàm `updateIsoMetadata`): cùng hint theo `levelCode`.
- Message trả về dạng: `Invalid documentNo for document level. Expected: ...`
- Frontend hiển thị `error.message` từ API (toast description) nên user thấy đủ gợi ý format.

### Bước 3 (tùy chọn): UX cho Level

- Ghi nhớ lần chọn Level gần nhất (localStorage/session) và pre-chọn khi mở lại dialog upload, để giảm trường hợp quên chọn Level 3.

---

## 5. Kết luận ngắn

- **Vì sao SOP-006 được, SOP-007 không:** Backend không phân biệt 006 vs 007; lỗi xảy ra khi **level đang chọn không phải Level 3** hoặc **documentNo nhập thiếu/không đúng format** (ví dụ thiếu `BPVN-WK-`).
- **Cách xử lý nhanh:** Chọn đúng **Level 3** và nhập đủ **BPVN-WK-SOP-007** (hoặc mã phòng tương ứng). Nếu vẫn lỗi, nên bổ sung message lỗi chi tiết theo level (bước 2).

---

## 6. Bổ sung: Message lỗi có "selected: LEVELx" (2026-02-07)

- **Vấn đề:** User nhập đúng Level 3 + BPVN-WK-SOP-007 nhưng vẫn báo "Invalid documentNo for document level" → cần biết **level mà backend đang dùng** để debug.
- **Đã làm:**
  1. **Backend:** Trong `document.service.ts` (upload + updateIsoMetadata), message lỗi thêm **level đang chọn**: `Invalid documentNo for document level (selected: LEVEL1). Expected: BPVN-QESM-001` (ví dụ). User thấy ngay là đang chọn LEVEL1 thay vì LEVEL3.
  2. **Frontend:** Trong `api.ts` (cả hai chỗ append formData), chỉ append field khi `value != null && value !== ""` → tránh gửi chuỗi `"undefined"` hoặc field rỗng gây lệch dữ liệu.
- **Kỳ vọng:** Khi lỗi xảy ra, toast hiển thị đầy đủ message (kèm "selected: LEVELx" và "Expected: ..."). Nếu thấy "selected: LEVEL1" trong khi đã chọn Level 3 trên UI → lỗi do levelId gửi sai (dropdown/state); nếu thấy "selected: LEVEL3" → documentNo gửi lên khác với BPVN-WK-SOP-007 (encoding/trim).
