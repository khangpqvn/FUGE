# Hướng dẫn Sử dụng Hệ thống FuGrade Web

Tài liệu hướng dẫn thao tác chi tiết cho từng vai trò người dùng trong hệ thống quản lý điểm FuGrade phiên bản Web.

---

## 1. Dành cho Giảng viên Giảng dạy Lớp Học phần (`.fg`)

### 1.1. Mở Bảng điểm Lớp
1. Truy cập ứng dụng FuGrade trên trình duyệt.
2. Tại màn hình khởi động, bấm nút **"Open .fg, .cmt, .tef, .master or .json"** và chọn tệp `.fg` của bạn (ví dụ: `khangpq3Summer2026.fg`).
3. Nếu tệp có mật khẩu bảo vệ, hộp thoại yêu cầu mật khẩu sẽ xuất hiện. Nhập mật khẩu và bấm **"Unlock"**.

### 1.2. Chọn Lớp & Gộp Lớp
- **Chọn lớp học phần**: Ở cột bên trái trong mục **"Subject / class"**, danh sách các lớp bạn phụ trách sẽ hiển thị cùng số lượng sinh viên. Bấm chọn lớp để xem bảng điểm tương ứng.
- **Gộp tất cả các lớp (`Merge all classes`)**: Nếu các lớp học phần có cấu trúc thành phần điểm hoàn toàn giống nhau, tích chọn ô **"Merge all classes ([All classes])"** để xem và nhập điểm cho toàn bộ sinh viên của các lớp trên cùng một bảng.

### 1.3. Nhập Điểm & Ghi chú
- **Nhập điểm trực tiếp**: Bấm vào ô điểm của sinh viên và gõ điểm số.
  - Điểm số hợp lệ: từ `0.0` đến `10.0`.
  - Cột thành phần có tên `"Status"`: chỉ nhận giá trị `1` (Đạt) hoặc `0` (Trượt).
  - Nếu nhập sai định dạng, ô điểm sẽ tự động hoàn tác về giá trị trước đó và hiển thị thông báo lỗi.
- **Ghi chú cá nhân (`Comment`)**: Gõ trực tiếp nhận xét vào cột Comment của từng sinh viên.
- **Ẩn/Hiện cột thành phần**: Trong mục **"Components"** ở cột trái, tích hoặc bỏ tích tên cột để ẩn bớt các cột chưa cần nhập.
- **Xóa toàn bộ điểm của một thành phần**: Bấm nút **"clear"** bên cạnh tên thành phần điểm để làm trống toàn bộ cột điểm đó.

### 1.4. Import Điểm Hàng loạt từ Clipboard (Paste Import)
1. Trong mục **"Paste import"** ở cột bên trái:
   - Chọn thành phần điểm cần nạp từ danh sách (ví dụ: `Quiz 1 marks`, `Assignment 1 marks`, hoặc `Comments`).
   - Sao chép bảng điểm từ Excel theo định dạng 2 cột: `Mã_sinh_viên` và `Điểm_số` (hoặc `Nhận_xét`), cách nhau bằng phím Tab hoặc dấu cách.
   - Dán vào khung văn bản **Paste import**.
   - Nếu dữ liệu dán có chứa dòng tiêu đề (Header), tích chọn **"Skip the first row (header)"**.
2. Bấm nút **"Import"**. Hệ thống sẽ tự động đối soát theo mã sinh viên (`Roll`) và điền điểm vào bảng, đồng thời báo cáo số lượng sinh viên đã nạp thành công và danh sách sinh viên không tìm thấy (nếu có).

### 1.5. Thêm Sinh viên & Thêm Thành phần Điểm
- **Thêm sinh viên**: Điền mã sinh viên (`Roll`) và họ tên (`Name`) trong mục **"Add student"**, sau đó bấm **"Add to [Lớp]"**.
- **Thêm thành phần điểm**: Gõ tên cột mới trong mục **"Components"** và bấm **"Add"**.

### 1.6. Chuyển sang Viết Nhận xét Đồ án
- Đối với các lớp đồ án có quy mô nhóm nhỏ (`<= 6` sinh viên), nút **"Write thesis comment"** sẽ xuất hiện phía trên bảng điểm.
- Bấm nút này để tự động chuyển toàn bộ danh sách sinh viên lớp sang biểu mẫu Nhận xét Đồ án (`.cmt`) mà không cần nhập lại thông tin.

### 1.7. Thiết lập Mật khẩu & Lưu File
- **Đặt mật khẩu**: Bấm vào nút **"Set password"** hoặc **"Password set"** trên thanh tiêu đề để thiết lập, đổi hoặc gỡ bỏ mật khẩu bảo vệ tệp.
- **Lưu file**: Bấm nút **"Export .fg"** trên thanh tiêu đề để tải về tệp `.fg` đã được mã hóa AES-CBC tương thích 100% với phiên bản FuGrade WinForms cũ.

---

## 2. Dành cho Giảng viên Hướng dẫn Đồ án (`.cmt`)

### 2.1. Khởi tạo Bản Nhận xét Đồ án
- **Cách 1**: Khởi tạo tự động từ bảng điểm lớp học phần `.fg` (xem mục 1.6).
- **Cách 2**: Tại màn hình khởi động, chọn **"Thesis comment"** để tạo bản nhận xét mới.
- **Cách 3**: Bấm **"Open .fg, .cmt, .tef, .master or .json"** và chọn tệp `.cmt` có sẵn để chỉnh sửa.

### 2.2. Điền Thông tin Đánh giá
1. **Thông tin đề tài**:
   - Nhập Mã môn học (`Subject code`), Lớp (`Class`), Học kỳ (`Semester`), Giảng viên hướng dẫn (`Supervisor`).
   - Nhập tên đề tài tiếng Việt (`Title Vietnamese`) và tiếng Anh (`Title English`).
2. **5 mục đánh giá bắt buộc** (theo đúng quy định của nhà trường):
   - `3.1 Nội dung đồ án` (`Thesis content`)
   - `3.2 Hình thức đồ án` (`Thesis form`)
   - `3.3 Thái độ của sinh viên` (`Student attitude`)
   - `4.1 Mức độ hoàn thành` (`Achievement level`)
   - `4.2 Hạn chế của đồ án` (`Limitation`)
3. **Kết luận điều kiện bảo vệ cho từng sinh viên**:
   - Đối với từng sinh viên trong bảng, tích chọn duy nhất 1 trong 3 trạng thái:
     - **Agree to defense**: Đủ điều kiện bảo vệ đợt 1.
     - **Revised for 2nd defense**: Chỉnh sửa để bảo vệ đợt 2.
     - **Disagree to defense**: Không đồng ý cho bảo vệ.
   - Thêm sinh viên mới hoặc xóa sinh viên bằng nút thao tác ở cuối dòng.

### 2.3. Xuất Tệp Nhận xét
- Bấm **"Export .cmt"** để tải về tệp `.cmt` theo chuẩn tuần tự hóa nhị phân BinaryFormatter gửi cho giáo vụ và hội đồng bảo vệ.
- Có thể bấm **"Export JSON"** để lưu bản sao lưu dạng Canonical JSON.

---

## 3. Dành cho Thành viên Hội đồng Chấm Bảo vệ (`.tef`)

### 3.1. Sử dụng Hội đồng Chấm Bảo vệ (Defense Council Desk)
Hội đồng bảo vệ có thể xử lý tập trung nhiều nhóm bảo vệ cùng lúc:
1. Tại màn hình khởi động hoặc trên thanh tiêu đề, bấm nút **"Defense council desk"** (biểu tượng huy hiệu màu tím).
2. Bấm **"Load .cmt Files"** hoặc **"Choose Folder"** để nạp tất cả các file nhận xét `.cmt` của các nhóm đồ án do giáo vụ cung cấp.
3. Bảng danh sách các nhóm đồ án sẽ hiển thị: Mã môn, Lớp, Giảng viên hướng dẫn, Tên đề tài, và số lượng sinh viên đủ điều kiện bảo vệ (`agreed`).
4. Bấm chọn nhóm đồ án bạn cần chấm.

### 3.2. Cấu hình Cán bộ Chấm & Barem Điểm
1. **Họ tên cán bộ chấm (`Evaluator Full Name`)**: Nhập họ tên không dấu (ví dụ: `Nguyen Van An`). Quy chuẩn tệp legacy bắt buộc chỉ dùng chữ cái không dấu và khoảng trắng.
2. **Barem tiêu chí (`Master Criteria`)**: Đã được đóng gói sẵn trong ứng dụng và tự nạp, không cần chọn tệp. Nếu bộ môn ban hành barem mới, xuất file `.master` từ màn hình **Master criteria** rồi nạp tại màn hình chấm theo nhóm đồ án (`Start a defense evaluation`).
3. **Chọn mã môn (`Select Subject Code`)**: Nếu tệp barem có nhiều mã môn tương thích, chọn mã môn cụ thể cho nhóm (ví dụ: `SEP490`).
4. Bấm **"Grade Selected Group"** để mở bảng chấm điểm chi tiết **trong một tab mới**, giúp cán bộ chấm mở nhiều nhóm song song. Nếu trình duyệt chặn cửa sổ mới, phiếu sẽ mở ngay tại tab hiện tại.

### 3.3. Chấm Điểm Bảo vệ
1. **Chấm điểm nhóm (`Group mark`)**: Nhập điểm đánh giá chung cho cả nhóm vào cột Group mark.
2. **Sao chép nhanh điểm nhóm**: Bấm nút **"Copy group mark to every student"** ở góc phải để sao chép toàn bộ điểm nhóm sang điểm của từng sinh viên.
3. **Điều chỉnh điểm cá nhân**: Điều chỉnh điểm cho từng sinh viên dựa trên phần trả lời vấn đáp cá nhân. Điểm mỗi tiêu chí không được vượt quá thang điểm tối đa (`Max`).
4. **Dòng tổng điểm (`Total`)**: Tự động tính toán tổng điểm của nhóm và tổng điểm của từng sinh viên theo thời gian thực.
5. **Ghi chú hội đồng (`Group note`)**: Điền nhận xét hoặc yêu cầu chỉnh sửa của hội đồng dành cho nhóm.
6. **Xem nhận xét của GVHD**: Bấm **"Show supervisor comment"** để xem lại toàn bộ bản nhận xét của giảng viên hướng dẫn ở chế độ chỉ đọc.
7. **Lưu phiếu chấm**: Bấm **"Export .tef"** để tải về tệp chấm điểm bảo vệ `.tef`.

### 3.4. Mở Phiếu Chấm Có sẵn (Chế độ Xem / Chỉnh sửa)
- Khi mở một tệp `.tef` có mật khẩu:
  - Bấm **"Unlock"** sau khi nhập mật khẩu để mở ở chế độ chỉnh sửa (`Edit mode`).
  - Hoặc bấm **"Open Read-Only"** để xem nội dung phiếu chấm ở chế độ chỉ đọc (`READ ONLY`) mà không cần mật khẩu.

---

## 4. Dành cho Giáo vụ & Chủ nhiệm Bộ môn

### 4.1. Tổng hợp Kết quả Hội đồng Bảo vệ (Summary Results)
1. Bấm nút **"Summary results"** trên màn hình khởi động hoặc trên thanh tiêu đề.
2. Bấm **"Choose defense files"** (chọn nhiều file `.tef`) hoặc **"Choose folder"** (chọn thư mục gốc chứa các thư mục con của từng nhóm đồ án).
3. Hệ thống sẽ tự động quét, kiểm tra tính nhất quán (`Signature`) giữa các file chấm của cùng một nhóm và hiển thị bảng kết quả:
   - Roll, Name, Title, Thang điểm (`Scale`), Điểm trung bình hội đồng (`Mark`), Danh sách điểm từng cán bộ chấm, và Ghi chú tổng hợp.
   - Điểm số được làm tròn chính xác theo luật làm tròn AwayFromZero chuẩn của trường.
4. Bấm nút **"Export .xlsx"** để tải về file Excel tổng hợp hoàn chỉnh gồm 2 Sheet:
   - **Sheet 1 (`Summary`)**: Bảng điểm chi tiết từng sinh viên.
   - **Sheet 2 (`Graded statistics`)**: Thống kê lượt chấm của từng giảng viên.

### 4.2. Quản lý Danh mục Tiêu chí Chấm Đồ án (`.master`)
1. Bấm nút **"Master criteria"** tại màn hình khởi động. Màn hình này dùng để xem, chỉnh sửa và xuất barem; nó không phải nơi cán bộ chấm nạp barem khi chấm điểm vì barem đã nằm sẵn trong ứng dụng.
2. Lọc tiêu chí theo mã môn ở góc phải trên.
3. **Thêm tiêu chí mới**: Điền Subject, Major, Minor, Item group, Grading item, Scale trong mục **"Add criterion"** và bấm **"Add criterion"**.
4. **Sửa tiêu chí**: Bấm trực tiếp vào ô cần sửa trên bảng và gõ nội dung mới.
5. **Xóa tiêu chí**: Bấm biểu tượng thùng rác ở dòng tương ứng.
6. Bấm **"Export .master"** để xuất tệp barem nhị phân chuẩn gửi cho các thành viên hội đồng.
