# HƯỚNG DẪN SỬ DỤNG CHỨC NĂNG YÊU CẦU XÓA TÀI LIỆU (DELETION REQUESTS)

## 1. TỔNG QUAN

Chức năng **Yêu cầu xóa tài liệu (Deletion Requests)** cho phép người dùng yêu cầu xóa các tài liệu đã quá thời hạn tự xóa (72 giờ). Tất cả các yêu cầu xóa sau 72 giờ đều phải được phê duyệt bởi DCC (Document Control Center) trước khi tài liệu được xóa.

### 1.1. Quy tắc 72 giờ

- **Trong 72 giờ đầu**: Người dùng có thể tự xóa tài liệu mà không cần phê duyệt
- **Sau 72 giờ**: Người dùng phải gửi yêu cầu xóa và chờ DCC phê duyệt
- **DCC**: Có thể xóa tài liệu bất cứ lúc nào mà không cần chờ 72 giờ

### 1.2. Ai có thể sử dụng?

- **Tất cả người dùng**: Có thể gửi yêu cầu xóa tài liệu của mình hoặc tài liệu trong phòng ban
- **DCC**: Có thể xem, phê duyệt hoặc từ chối tất cả các yêu cầu xóa
- **Admin**: Có thể xem tất cả các yêu cầu xóa

---

## 2. CÁCH GỬI YÊU CẦU XÓA TÀI LIỆU

### 2.1. Khi nào cần gửi yêu cầu?

Bạn cần gửi yêu cầu xóa khi:
- Tài liệu đã được tải lên **hơn 72 giờ**
- Bạn muốn xóa tài liệu nhưng không thể tự xóa được
- Hệ thống hiển thị badge **"Requires DCC Approval"** (Yêu cầu phê duyệt DCC)

### 2.2. Các bước gửi yêu cầu

1. **Tìm tài liệu cần xóa**
   - Điều hướng đến danh sách tài liệu
   - Tìm tài liệu bạn muốn xóa
   - Kiểm tra badge trạng thái: nếu hiển thị "Requires DCC Approval" nghĩa là bạn cần gửi yêu cầu

2. **Mở hộp thoại yêu cầu xóa**
   - Click vào nút **"Request Deletion"** hoặc **"Yêu cầu xóa"** trên tài liệu
   - Hộp thoại yêu cầu xóa sẽ hiển thị

3. **Điền thông tin yêu cầu**
   - **Lý do xóa** (bắt buộc): Giải thích tại sao bạn muốn xóa tài liệu này
     - Tối thiểu 10 ký tự
     - Nên mô tả chi tiết và rõ ràng
     - Ví dụ: "Tài liệu đã lỗi thời, đã có bản cập nhật mới"
   - **File thay thế** (tùy chọn): Nếu có file mới thay thế, nhập ID của file đó
     - Upload file mới trước (nếu có)
     - Copy ID của file mới
     - Dán vào trường "Replacement file ID"

4. **Gửi yêu cầu**
   - Click nút **"Submit Request"** (Gửi yêu cầu)
   - Hệ thống sẽ xác nhận yêu cầu đã được gửi
   - Badge trạng thái sẽ chuyển thành **"Pending DCC Review"** (Đang chờ DCC xem xét)

### 2.3. Ví dụ mẫu lý do xóa

**Tốt:**
- "Tài liệu này đã được thay thế bằng bản cập nhật mới (file ID: abc123). Bản cũ chứa thông tin không chính xác."
- "Tài liệu bị trùng lặp với file khác trong cùng thư mục. File cần giữ lại là version 2.0."
- "Tài liệu đã hết hạn sử dụng theo quy định. Đã có tài liệu mới thay thế."

**Không tốt:**
- "Xóa" (quá ngắn, không đủ 10 ký tự)
- "Không cần nữa" (không rõ ràng)
- "Test" (không phù hợp)

---

## 3. THEO DÕI TRẠNG THÁI YÊU CẦU

### 3.1. Các trạng thái yêu cầu

Hệ thống hiển thị các badge trạng thái khác nhau:

| Badge | Ý nghĩa | Mô tả |
|-------|---------|-------|
| 🟢 **Can Delete** (Có thể xóa) | Tài liệu còn trong 72 giờ | Bạn có thể tự xóa ngay, không cần yêu cầu |
| 🟡 **Requires DCC Approval** (Yêu cầu phê duyệt DCC) | Đã quá 72 giờ, chưa có yêu cầu | Cần gửi yêu cầu xóa để DCC phê duyệt |
| 🟠 **Pending DCC Review** (Đang chờ DCC xem xét) | Đã gửi yêu cầu, đang chờ | Yêu cầu của bạn đang được DCC xem xét |
| 🔴 **Rejected** (Bị từ chối) | DCC đã từ chối yêu cầu | Click vào badge để xem lý do từ chối |
| ❌ **No Permission** (Không có quyền) | Không có quyền xóa | Bạn không phải người upload hoặc không thuộc phòng ban |

### 3.2. Xem chi tiết yêu cầu bị từ chối

Khi yêu cầu bị từ chối:
1. Badge sẽ hiển thị **"Rejected"** màu đỏ
2. Click vào badge để xem chi tiết:
   - Lý do bạn đã gửi
   - Lý do DCC từ chối (nếu có)
   - Người xem xét
   - Thời gian xem xét

### 3.3. Gửi lại yêu cầu sau khi bị từ chối

Nếu yêu cầu bị từ chối, bạn có thể:
1. Xem lý do từ chối từ DCC
2. Sửa lại lý do xóa (nếu cần)
3. Gửi lại yêu cầu mới với thông tin cập nhật

---

## 4. QUY TRÌNH PHÊ DUYỆT CỦA DCC

### 4.1. Xem danh sách yêu cầu

**DCC** có thể:
1. Đăng nhập vào hệ thống
2. Điều hướng đến **Dashboard → DCC → Deletion Requests**
3. Xem tất cả các yêu cầu đang chờ phê duyệt

### 4.2. Thông tin hiển thị cho DCC

Mỗi yêu cầu hiển thị:
- **Tên tài liệu** và tên file
- **Người yêu cầu**: Tên và username
- **Thời gian yêu cầu**: Ngày và giờ gửi yêu cầu
- **Lý do xóa**: Lý do người dùng cung cấp
- **File thay thế** (nếu có): Link đến file mới

### 4.3. Phê duyệt yêu cầu

**Các bước phê duyệt:**
1. Xem xét thông tin yêu cầu
2. Click nút **"Approve"** (Phê duyệt)
3. Xác nhận trong hộp thoại xác nhận
4. Hệ thống sẽ:
   - Tự động xóa tài liệu (di chuyển vào thư mục "Deleted files")
   - Cập nhật trạng thái yêu cầu thành "APPROVED"
   - Gửi thông báo cho người yêu cầu (nếu có)

### 4.4. Từ chối yêu cầu

**Các bước từ chối:**
1. Xem xét thông tin yêu cầu
2. Click nút **"Reject"** (Từ chối)
3. Nhập lý do từ chối (tùy chọn nhưng nên có):
   - Giải thích tại sao yêu cầu không được chấp nhận
   - Hướng dẫn người dùng cần làm gì (nếu có)
4. Click **"Reject Request"**
5. Hệ thống sẽ:
   - Cập nhật trạng thái yêu cầu thành "REJECTED"
   - Lưu lý do từ chối
   - Gửi thông báo cho người yêu cầu (nếu có)

### 4.5. Lưu ý cho DCC

- **Xem xét kỹ**: Đọc kỹ lý do xóa và kiểm tra file thay thế (nếu có)
- **Ghi chú rõ ràng**: Khi từ chối, nên ghi rõ lý do để người dùng hiểu
- **Xử lý nhanh**: Cố gắng xử lý yêu cầu trong thời gian hợp lý
- **Kiểm tra file thay thế**: Nếu có file thay thế, nên xác minh file đó phù hợp

---

## 5. CÁC TÌNH HUỐNG THƯỜNG GẶP

### 5.1. Tình huống 1: Xóa nhầm tài liệu trong 72 giờ

**Vấn đề**: Bạn vừa upload nhầm tài liệu và muốn xóa ngay.

**Giải pháp**: 
- Bạn có thể tự xóa ngay mà không cần yêu cầu
- Tìm tài liệu trong danh sách
- Click nút "Delete" (Xóa)
- Xác nhận xóa

### 5.2. Tình huống 2: Tài liệu đã quá 72 giờ

**Vấn đề**: Bạn muốn xóa tài liệu nhưng đã quá 72 giờ.

**Giải pháp**:
1. Gửi yêu cầu xóa với lý do rõ ràng
2. Chờ DCC phê duyệt
3. Nếu bị từ chối, xem lý do và gửi lại (nếu cần)

### 5.3. Tình huống 3: Có file mới thay thế

**Vấn đề**: Bạn đã upload file mới và muốn xóa file cũ.

**Giải pháp**:
1. Upload file mới trước
2. Copy ID của file mới
3. Gửi yêu cầu xóa file cũ
4. Trong yêu cầu, nhập ID của file mới vào trường "Replacement file ID"
5. Giải thích rõ trong lý do: "File cũ đã được thay thế bằng file mới (ID: xxx)"

### 5.4. Tình huống 4: Yêu cầu bị từ chối

**Vấn đề**: Yêu cầu xóa của bạn bị DCC từ chối.

**Giải pháp**:
1. Click vào badge "Rejected" để xem lý do
2. Đọc kỹ lý do từ chối
3. Nếu cần, sửa lại lý do và gửi lại yêu cầu
4. Nếu không đồng ý, liên hệ DCC để trao đổi

### 5.5. Tình huống 5: Không thấy nút xóa

**Vấn đề**: Bạn không thấy nút xóa hoặc nút yêu cầu xóa.

**Nguyên nhân có thể**:
- Bạn không phải người upload tài liệu
- Bạn không thuộc phòng ban của tài liệu
- Bạn không có quyền xóa

**Giải pháp**:
- Liên hệ người upload hoặc quản trị viên
- Nếu bạn là DCC, bạn có thể xóa bất cứ tài liệu nào

---

## 6. CÂU HỎI THƯỜNG GẶP (FAQ)

### Q1: Tại sao có quy tắc 72 giờ?

**Trả lời**: Quy tắc 72 giờ giúp:
- Người dùng có thời gian sửa lỗi nếu upload nhầm
- Bảo vệ dữ liệu quan trọng khỏi việc xóa nhầm
- Đảm bảo tính toàn vẹn của hệ thống quản lý tài liệu

### Q2: Làm sao biết tài liệu còn bao nhiêu thời gian có thể tự xóa?

**Trả lời**: 
- Badge trạng thái sẽ hiển thị: "Can Delete (Xh Ym left)"
- Ví dụ: "Can Delete (5h 30m left)" nghĩa là còn 5 giờ 30 phút

### Q3: Yêu cầu xóa mất bao lâu để được xử lý?

**Trả lời**: 
- Tùy thuộc vào DCC
- Thông thường trong vòng 1-2 ngày làm việc
- Yêu cầu khẩn cấp có thể liên hệ DCC trực tiếp

### Q4: Có thể hủy yêu cầu xóa không?

**Trả lời**: 
- Hiện tại chưa có chức năng hủy yêu cầu
- Nếu muốn hủy, liên hệ DCC để từ chối yêu cầu
- Hoặc đợi DCC xử lý và giải thích

### Q5: File bị xóa sẽ đi đâu?

**Trả lời**: 
- File không bị xóa hoàn toàn
- File được di chuyển vào thư mục "Deleted files" của phòng ban
- DCC có thể khôi phục nếu cần

### Q6: Có thể xóa nhiều tài liệu cùng lúc không?

**Trả lời**: 
- Hiện tại chỉ có thể xóa từng tài liệu một
- Mỗi tài liệu cần một yêu cầu riêng (nếu quá 72 giờ)

### Q7: DCC có thể xóa tài liệu mà không cần yêu cầu không?

**Trả lời**: 
- Có, DCC có thể xóa bất cứ tài liệu nào bất cứ lúc nào
- DCC không cần chờ 72 giờ
- DCC không cần gửi yêu cầu

### Q8: Làm sao biết yêu cầu đã được xử lý?

**Trả lời**: 
- Badge trạng thái sẽ thay đổi:
  - "Pending DCC Review" → "Rejected" hoặc tài liệu biến mất (nếu được phê duyệt)
- Hệ thống sẽ cập nhật real-time khi DCC xử lý

---

## 7. LƯU Ý QUAN TRỌNG

### 7.1. Trước khi gửi yêu cầu

- ✅ Kiểm tra kỹ tài liệu có thực sự cần xóa không
- ✅ Đảm bảo đã có file thay thế (nếu cần)
- ✅ Viết lý do rõ ràng, chi tiết
- ✅ Kiểm tra lại thông tin trước khi gửi

### 7.2. Sau khi gửi yêu cầu

- ⏰ Theo dõi trạng thái yêu cầu
- 📧 Kiểm tra thông báo từ hệ thống
- 🔄 Sẵn sàng gửi lại nếu bị từ chối

### 7.3. Quyền và trách nhiệm

- **Người dùng**: 
  - Chịu trách nhiệm về lý do xóa
  - Cung cấp thông tin chính xác
  - Tuân thủ quy trình

- **DCC**: 
  - Xem xét kỹ lưỡng mỗi yêu cầu
  - Đưa ra quyết định công bằng
  - Ghi chú rõ ràng khi từ chối

---

## 8. HỖ TRỢ VÀ LIÊN HỆ

Nếu gặp vấn đề hoặc có câu hỏi:

1. **Kiểm tra FAQ** ở trên trước
2. **Liên hệ DCC** nếu cần hỗ trợ về yêu cầu xóa
3. **Liên hệ IT Support** nếu gặp lỗi kỹ thuật
4. **Xem tài liệu hướng dẫn** khác trong hệ thống

---

**Phiên bản tài liệu**: 1.0  
**Ngày cập nhật**: 23/01/2026  
**Người soạn**: Hệ thống Quản lý Tài liệu
