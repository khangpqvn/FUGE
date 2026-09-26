# Đặc tả Kỹ thuật Chi tiết Dự án FuGrade Legacy (C# WinForms)

Tài liệu này ghi lại toàn bộ đặc tả kỹ thuật, cấu trúc mã nguồn, mô hình dữ liệu, thuật toán mã hóa và các quy tắc nghiệp vụ của ứng dụng FuGrade phiên bản C# WinForms gốc (`D:/Work/FUGE/old/`).

---

## 1. Cấu trúc Solution & Thư viện

Solution gồm hai project chính chạy trên .NET Framework:

### 1.1. `FuGradeLib` (Thư viện dùng chung - Class Library)
Cung cấp các cấu trúc dữ liệu cốt lõi cho việc quản lý bảng điểm học phần thông thường:
- **`TeacherGrade.cs`**:
  - `string Version`: Phiên bản phần mềm (mặc định `"1.1"`).
  - `string Semester`: Học kỳ (ví dụ: `"Summer 2026"`).
  - `string Login`: Tên đăng nhập của giảng viên bộ môn (ví dụ: `"khangpq3"`).
  - `string Password`: Chuỗi băm MD5 của mật khẩu bảo vệ file (rỗng nếu không có mật khẩu).
  - `List<SubjectClassGrade> SubjectClassGrades`: Danh sách các lớp học phần được phân công.
- **`SubjectClassGrade.cs`**:
  - `string Subject`: Mã môn học (ví dụ: `"SEP490"`).
  - `string Class`: Mã lớp học (ví dụ: `"SE1732"`).
  - `List<Student> Students`: Danh sách sinh viên thuộc lớp.
  - `List<string> Components`: Danh sách tên các đầu điểm thành phần (ví dụ: `["Assignment 1", "Quiz 1", "Status", "Final Exam"]`).
- **`Student.cs`**:
  - `string Roll`: Mã số sinh viên (khóa sắp xếp `IComparable<Student>`, so sánh không phân biệt hoa thường).
  - `string Name`: Họ và tên sinh viên.
  - `string Comment`: Ghi chú hoặc nhận xét cá nhân cho sinh viên.
  - `List<GradeComponent> Grades`: Danh sách điểm thành phần tương ứng với các cột `Components`.
- **`GradeComponent.cs`**:
  - `string Component`: Tên đầu điểm thành phần.
  - `float? Grade`: Điểm số (kiểu nullable float; `null` đại diện cho ô điểm chưa nhập).

### 1.2. `FuGrade` (Ứng dụng giao diện WinForms)
Chứa các Form giao diện và các mô hình quản lý đồ án tốt nghiệp:
- **`ThesisComment.cs`**: Bản nhận xét đồ án của giảng viên hướng dẫn.
- **`ThesisStudent.cs`**: Sinh viên đồ án và kết luận điều kiện bảo vệ.
- **`DefenseGrading.cs`**: Phiếu chấm bảo vệ của thành viên hội đồng.
- **`DefenseStudentGrade.cs`**: Điểm bảo vệ của từng sinh viên.
- **`GradedItem.cs`**: Tiêu chí chấm và điểm số (điểm nhóm và điểm cá nhân).
- **`FinalThesisGradingItem.cs`**: Danh mục tiêu chí chấm đồ án trong file Master.
- **`FinalGrade.cs` & `FinalGradeOfTeacher.cs`**: Đối tượng tổng hợp điểm đồ án của cả hội đồng.
- **`AesOperation.cs` & `Helper.cs`**: Tiện ích mã hóa AES và băm MD5.

---

## 2. Đặc tả Form Giao diện & Trách nhiệm

| Form | Trách nhiệm chính | Tệp dữ liệu liên quan |
|---|---|---|
| **`FrmFuGrade`** | Màn hình chính quản lý bảng điểm lớp học phần: mở/lưu `.fg`, giải mã AES, xác thực mật khẩu, chuyển đổi lớp/gộp lớp (`chbMergeClass`), hiển thị bảng điểm, thêm sinh viên/thành phần, tìm kiếm theo MSSV, nút tạo nhận xét đồ án (`btnComment`). | `.fg` |
| **`FrmThesisComment`** | Màn hình viết nhận xét đồ án tốt nghiệp: điền tiêu đề Tiếng Việt/Anh, bắt buộc 5 mục đánh giá (3.1, 3.2, 3.3, 4.1, 4.2), chọn 1 trong 3 trạng thái kết luận bảo vệ cho từng sinh viên, lưu file `.cmt`. | `.cmt` |
| **`FrmDefenseGrading`** | Màn hình tiếp nhận nhóm bảo vệ cho thành viên hội đồng: duyệt thư mục chứa các file `.cmt`, nạp danh sách nhóm, kiểm tra tên cán bộ chấm (không dấu), chọn nhóm để chuyển sang chấm điểm, mở file `.tef` có sẵn (hỗ trợ Read-Only hoặc Edit). | `.cmt`, `.tef` |
| **`FrmEvaluationForm`** | Màn hình chấm điểm bảo vệ: nạp tiêu chí từ `.master`, xây dựng lưới điểm (Tiêu chí, Thang điểm, Điểm nhóm, Điểm từng SV), nút Copy điểm nhóm sang tất cả SV, kiểm tra điểm <= Max mark, ghi chú hội đồng, xem nhận xét GVHD. | `.master`, `.tef` |
| **`FrmChooseSujectCode`** | Hộp thoại chọn mã môn học cụ thể khi file `.master` có nhiều mã môn tương thích với mã môn của nhóm đồ án. | `.master` |
| **`FrmSummarizeThesisResult`** | Màn hình tổng hợp kết quả của hội đồng: duyệt cây thư mục chứa các file `.tef`, kiểm tra tính nhất quán (Signature), tính điểm trung bình hội đồng (làm tròn AwayFromZero), xuất file Excel 2 sheet. | `.tef`, `.xlsx` |
| **`FrmCreateFinalCPGradingItems`** | Quản trị tiêu chí chấm đồ án: quản lý cấu trúc tiêu chí theo SubjectCode, Major, Minor, ItemGroup, GradingItem, Scale, lưu file `.master`. | `.master` |
| **`FrmImport`** | Hộp thoại hỗ trợ dán văn bản từ clipboard (tab/khoảng trắng) để nạp điểm hàng loạt hoặc nạp nhận xét hàng loạt, hỗ trợ bỏ qua dòng tiêu đề đầu tiên. | `.fg` |
| **`FrmPassword`** | Hộp thoại yêu cầu nhập mật khẩu khi mở file có thiết lập mật khẩu bảo vệ. | `.fg`, `.cmt`, `.tef` |
| **`FrmSetPassword`** | Hộp thoại yêu cầu thiết lập mật khẩu mới (có xác nhận lại mật khẩu) khi lưu file chưa có mật khẩu. | `.fg`, `.cmt`, `.tef` |

---

## 3. Đặc tả Mã hóa & Định dạng Tệp

### 3.1. Thuật toán Mã hóa AES-CBC (`AesOperation.cs`)
File `.fg` được mã hóa đối xứng bằng thuật toán AES:
- **Khóa mặc định (DEFAULT_KEY)**: Chuỗi ký tự ASCII cố định:
  ```text
  "l10ca968o8e4133tyne2ea2315g19377" (32 bytes = 256 bits)
  ```
- **Vector khởi tạo (IV)**: Mảng 16 byte giá trị 0 (`new byte[16]`).
- **Chế độ mã hóa**: `Aes.Create()`, mã hóa CBC, Padding chuẩn PKCS7.
- **Định dạng lưu trữ**: Chuỗi Base64 của mảng byte mã hóa ghi thẳng vào tệp văn bản.
- **Nội dung bên trong**: Chuỗi JSON đại diện cho đối tượng `TeacherGrade` (do `Newtonsoft.Json` tuần tự hóa). Trong một số phiên bản cũ hơn, nếu giải mã AES thất bại, hệ thống tự động fallback đọc theo chuẩn .NET `BinaryFormatter`.

### 3.2. Thuật toán Băm Mật khẩu MD5 (`Helper.cs`)
- Sử dụng thuật toán băm chuẩn MD5:
  ```csharp
  byte[] array = md5Hash.ComputeHash(Encoding.UTF8.GetBytes(input));
  ```
- Kết quả được định dạng thành chuỗi hex chữ thường 32 ký tự (`"x2"`).
- Khi kiểm tra mật khẩu (`VerifyMd5Hash`), hệ thống sử dụng phép so sánh không phân biệt hoa thường (`StringComparer.OrdinalIgnoreCase`).

### 3.3. Định dạng .NET BinaryFormatter (`.cmt`, `.tef`, `.master`)
Các tệp `.cmt`, `.tef`, và `.master` được ghi bằng `System.Runtime.Serialization.Formatters.Binary.BinaryFormatter`:
- Header bắt đầu bằng magic header: `00 01 00 00 00 FF FF FF FF 01 00 00 00 00 00 00 00`.
- Chứa đồ thị đối tượng với định danh assembly `FuGrade` và `mscorlib`.
- Trong phiên bản Web mới, toàn bộ quá trình đọc và ghi được giải mã bằng bộ Codec TypeScript độc lập, không thực thi mã máy tùy ý (safe bounded fixed-schema codec).

---

## 4. Các Quy tắc Nghiệp vụ (Business Rules)

### 4.1. Quy tắc Nhập điểm Lớp Học phần
1. **Thang điểm**: Điểm số mỗi thành phần phải là số thực từ `0.0` đến `10.0`.
2. **Cột trạng thái (Status)**: Nếu tên thành phần điểm là `"Status"`, giá trị điểm chỉ được phép là `1` (Đạt/Pass) hoặc `0` (Trượt/Fail).
3. **Gộp lớp (`MergeClass`)**: Chỉ cho phép gộp các lớp học phần (`[All classes]`) khi tất cả các lớp trong file `.fg` có danh sách thành phần điểm hoàn toàn trùng khớp nhau (`Components`).

### 4.2. Quy tắc Nhận xét Đồ án Tốt nghiệp (`.cmt`)
1. **Kích thước nhóm tối đa**: `MaxThesisGroupSize = 6`. Nút chuyển sang nhận xét đồ án (`btnComment`) trên màn hình lớp học phần chỉ khả dụng khi số lượng sinh viên trong lớp `<= 6`.
2. **5 mục đánh giá bắt buộc**: Giảng viên không được để trống bất kỳ trường nào trong 5 mục sau:
   - `3.1 Nội dung đồ án` (`Content`)
   - `3.2 Hình thức đồ án` (`Form`)
   - `3.3 Thái độ của sinh viên` (`Attitude`)
   - `4.1 Mức độ hoàn thành` (`Achievement`)
   - `4.2 Hạn chế của đồ án` (`Limitation`)
3. **Kết luận điều kiện bảo vệ**: Mỗi sinh viên trong nhóm phải nhận duy nhất 1 trong 3 kết luận (được đánh dấu bằng chữ `'x'` hoặc `'X'`):
   - `Agree_to_defense`: Đồng ý cho bảo vệ.
   - `Revised_for_the_second_defense`: Yêu cầu chỉnh sửa để bảo vệ đợt 2.
   - `Disagree_to_defense`: Không đồng ý cho bảo vệ.

### 4.3. Quy tắc Hội đồng Chấm Bảo vệ (`.tef`)
1. **Tên cán bộ chấm (`GradedTeacher`)**: Bắt buộc chỉ chứa chữ cái tiếng Anh không dấu và dấu cách (`IsWithoutAccents`), không chứa dấu phụ, số hoặc ký tự đặc biệt vì tên này được dùng trực tiếp trong tên file `.tef`.
2. **Điều kiện sinh viên được chấm**: Chỉ những sinh viên có kết luận `Agree_to_defense = "x"` mới được đưa vào danh sách chấm điểm. Sinh viên không đồng ý bảo vệ được gắn nhãn `(disagree to defense)` và không có kết luận trong phiếu.
3. **Điểm từng tiêu chí**:
   - `GroupMark` và `Mark` của từng sinh viên phải `>= 0` và `<= Scale` (điểm tối đa của tiêu chí đó).
   - Nút `Copy group mark` sẽ sao chép giá trị của cột `Group mark` sang cho tất cả các sinh viên trong nhóm.
   - Tổng điểm được tự động tính ở dòng cuối cùng của bảng.

### 4.4. Quy tắc Tổng hợp Điểm Hội đồng (`.xlsx`)
1. **Kiểm tra tính nhất quán nhóm (Signature)**: Tất cả các file `.tef` trong cùng một thư mục con nhóm phải có cùng chữ ký nhận diện:
   ```text
   Signature = "{Semester}-{SubjectCode}-{ClassName}-{Roll1}-{Roll2}-..."
   ```
   Nếu trong cùng một thư mục con xuất hiện các file `.tef` khác chữ ký, hệ thống sẽ từ chối tổng hợp.
2. **Làm tròn điểm theo luật AwayFromZero**:
   - Điểm của từng giảng viên chấm được làm tròn đến 1 chữ số thập phân:
     $$\text{TeacherMark} = \text{Round}(\sum \text{ItemMarks}, 1, \text{MidpointRounding.AwayFromZero})$$
   - Điểm trung bình bảo vệ của sinh viên là trung bình cộng của các giảng viên chấm, làm tròn 1 chữ số thập phân:
     $$\text{AvgMark} = \text{Round}\left(\frac{\sum_{i=1}^N \text{TeacherMark}_i}{N}, 1, \text{MidpointRounding.AwayFromZero}\right)$$
3. **Ghi chú tổng hợp**:
   - Nếu sinh viên có trạng thái không đồng ý bảo vệ: Note = `"Disagree to defense"`.
   - Nếu giảng viên có ghi chú: Ghép chuỗi `"{GradedTeacher}: {Note}; "`.
4. **Cấu trúc File Excel xuất ra**:
   - **Sheet 1 ("Summary")**: Cột No, Roll Number, Full Name, Subject code, Class, Semester, Thesis title, Supervisor, Date-Time, Group Note, Mark (AvgMark), Scale, và các cột điểm riêng của từng giảng viên trong hội đồng.
   - **Sheet 2 ("Graded statistics")**: Bảng thống kê chi tiết lượt chấm: No, Teacher, Subject, Group Name, Title, Supervisor, Time.

---

## 5. Quy ước Đặt tên Tệp Chuẩn

Hệ thống FuGrade WinForms áp dụng quy ước đặt tên file nghiêm ngặt:

| Loại tệp | Quy tắc đặt tên | Ví dụ thực tế |
|---|---|---|
| **Bảng điểm lớp** (`.fg`) | `{Login}{Semester}.fg` | `khangpq3Summer2026.fg` |
| **Nhận xét đồ án** (`.cmt`) | `{Login}_{SubjectCode}_{Class}.cmt` | `huectm_SEP490_SE1732.cmt` hoặc `SEP490_SEP490_G5_huectm.cmt` |
| **Phiếu chấm bảo vệ** (`.tef`) | `{GradedTeacher}_{SubjectCode}_{RollFirstStudent}_{Year}{Month}{Day}_{Supervisor}.tef` | `khangpq_SEP490_HE173247_2026828_viht7.tef` |
| **Barem tiêu chí** (`.master`) | `FinalThesisGradingItems.master` | `MasterFile/FinalThesisGradingItems.master` |
| **Báo cáo tổng hợp** (`.xlsx`) | Báo cáo Excel mở trực tiếp qua COM Automation hoặc lưu thành file | `fugrade-defense-summary.xlsx` |
| **Tệp trung gian Web** (`.json`) | `{TênGốc}.fuge.json` | `SEP490_SEP490_G5_huectm.fuge.json` |
