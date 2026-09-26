# Kiến trúc Web App & Bộ Codec BinaryFormatter Thuần TypeScript

Tài liệu này trình bày kiến trúc của ứng dụng Web FuGrade mới, cơ chế bảo mật, cấu trúc tệp Canonical JSON và giải pháp giải mã/tuần tự hóa nhị phân .NET BinaryFormatter trực tiếp trên trình duyệt mà không cần cài đặt .NET Framework hay chạy server phụ trợ.

---

## 1. Tổng quan Kiến trúc Ứng dụng Web

Ứng dụng Web FuGrade được thiết kế theo mô hình **Client-Side First (100% In-Browser)**:

```mermaid
graph TD
    subgraph Browser["Trình duyệt Web (Client Runtime)"]
        UI["Giao diện Người dùng<br/>React 19 + Tailwind CSS + Lucide Icons"]
        
        subgraph LogicLayer["Lớp Nghiệp vụ & Dữ liệu"]
            DocStore["Quản lý Tài liệu Hiện thời<br/>(WorkflowDocument State)"]
            Validators["Xác thực Ràng buộc Nghiệp vụ<br/>(document-validation.ts)"]
            GradingEdits["Xử lý Bảng điểm & Import<br/>(grading-edits.ts)"]
            FinalGradeCalc["Tính điểm Hội đồng & Làm tròn<br/>(final-grade.ts)"]
        end

        subgraph CodecLayer["Lớp Giải mã & Mã hóa (Local Codecs)"]
            AES_Crypto["AES-CBC Web Crypto<br/>(legacy-fg.ts)"]
            MD5_Hasher["MD5 Password Hasher<br/>(legacy-fg.ts)"]
            BF_Reader["BinaryFormatter Reader<br/>(reader.ts / object-table.ts)"]
            BF_Writer["BinaryFormatter Writer<br/>(schemas.ts / legacy-codec.ts)"]
            Excel_Gen["Xuất Excel 2 Sheet<br/>(xlsx-export.ts / SheetJS)"]
        end
    end

    subgraph Files["Tệp Dữ liệu"]
        FG[".fg (AES-CBC Base64)"] <--> AES_Crypto
        CMT[".cmt (Binary Stream)"] <--> BF_Reader & BF_Writer
        TEF[".tef (Binary Stream)"] <--> BF_Reader & BF_Writer
        MASTER[".master (Binary Stream)"] <--> BF_Reader & BF_Writer
        JSON[".fuge.json (Canonical)"] <--> DocStore
        XLSX[".xlsx (Báo cáo)"] <-- Excel_Gen
    end

    UI <--> LogicLayer
    LogicLayer <--> CodecLayer
```

### 1.1. Lợi ích so với Kiến trúc Cũ
1. **Độc lập nền tảng**: Chạy trên mọi hệ điều hành (Windows, macOS, Linux, ChromeOS, iPad) mà không cần máy tính Windows cài .NET Framework 4.x.
2. **Không cần cài đặt**: Người dùng chỉ cần mở trình duyệt, không cần cấp quyền Administrator hay chạy file `.exe`.
3. **An toàn tuyệt đối**:
   - Định dạng `BinaryFormatter` trong .NET vốn tiềm ẩn nguy cơ thực thi mã máy từ xa (Remote Code Execution - RCE) nếu mở file độc hại.
   - Bộ giải mã TypeScript trên trình duyệt chỉ bóc tách các trường dữ liệu theo Schema cố định (Bounded Schema), hoàn toàn không nạp assembly hay thực thi code, loại bỏ 100% lỗ hổng bảo mật.
4. **Không phụ thuộc Server Backend**: Dữ liệu bảng điểm học tập của sinh viên được xử lý hoàn toàn trong bộ nhớ máy cục bộ của người dùng, không bị gửi lên bất kỳ máy chủ bên thứ ba nào, đảm bảo quyền riêng tư dữ liệu học đường.

---

## 2. Bộ Codec BinaryFormatter Thuần TypeScript

Cơ chế giải mã nhị phân nằm trong thư mục `src/lib/binary-formatter/`:
- `records.ts`: Định nghĩa các hằng số byte type của giao thức .NET Remoting Binary Format (MS-NRBF).
- `reader.ts`: Trình phân tích dòng byte tuần tự (`BinaryReader`), đọc số nguyên, số thực, chuỗi UTF-8 có tiền tố độ dài `7-bit encoded int`.
- `object-table.ts`: Bảng ánh xạ đối tượng hỗ trợ tham chiếu chéo (`ObjectId`, `MemberReference`), bảo vệ chống tràn bộ nhớ và chống vòng lặp đệ quy vô hạn.
- `schemas.ts`: Khai báo cấu trúc cố định cho các kiểu `ThesisComment`, `ThesisStudent`, `DefenseGrading`, `DefenseStudentGrade`, `GradedItem`, `FinalThesisGradingItem`.
- `legacy-codec.ts`: Điều phối đọc từ byte sang `WorkflowDocument` và ngược lại đóng gói byte theo đúng chuẩn BinaryFormatter.

### 2.1. Cấu trúc Giao thức MS-NRBF Được Hỗ trợ
Bộ giải mã hỗ trợ chính xác các loại bản ghi của .NET BinaryFormatter:
- `SerializedStreamHeader` (`0x00`): Đánh dấu bắt đầu stream nhị phân.
- `BinaryLibrary` (`0x0C`): Đăng ký định danh thư viện `FuGrade` hoặc `mscorlib`.
- `ClassWithMembersAndTypes` (`0x05`): Khai báo lớp cùng danh sách tên trường và kiểu dữ liệu tương ứng.
- `SystemClassWithMembersAndTypes` (`0x04`): Khai báo các lớp thuộc thư viện hệ thống .NET.
- `MemberPrimitiveTyped` (`0x08`): Đọc giá trị nguyên thủy (Boolean, Int32, Single, DateTime).
- `BinaryObjectString` (`0x06`): Chuỗi ký tự UTF-8 có gán `ObjectId`.
- `ObjectNull` (`0x0A`): Giá trị null cho trường đối tượng.
- `MemberReference` (`0x09`): Tham chiếu đến một `ObjectId` đã được giải mã trước đó.
- `BinaryArray` (`0x07`): Mảng một chiều chứa các đối tượng sinh viên hoặc tiêu chí chấm điểm.
- `MessageEnd` (`0x0B`): Đánh dấu kết thúc dòng tuần tự hóa.

### 2.2. Kiểm thử Tương thích Hai chiều (Round-Trip Fidelity)
Bộ codec được kiểm thử tự động với các file mẫu thực tế từ hệ thống cũ (`old/FuGrade/MasterFile/`):
- `SEP490_SEP490_G5_huectm.cmt`: Giải mã thành công 5 sinh viên đồ án với đầy đủ đánh giá.
- `khangpq_SEP490_CHẤM BẢO VỆ_HE173247_2026828_viht7.tef`: Giải mã chính xác toàn bộ điểm nhóm và điểm từng sinh viên.
- `khangpq_SEP490_CHẤM NGUỘI_HE173247_2026828_viht7.tef`: Giải mã phiếu chấm nguội.
- `FinalThesisGradingItems.master`: Giải mã toàn bộ cây tiêu chí barem điểm của các ngành.

---

## 3. Mã hóa & Bảo mật Bằng Web Crypto API

Trong tệp `src/lib/legacy-fg.ts`:

### 3.1. AES-256-CBC Giải mã & Mã hóa Tương thích C#
- **Khóa bí mật**:
  ```ts
  const DEFAULT_KEY_BYTES = new TextEncoder().encode("l10ca968o8e4133tyne2ea2315g19377")
  ```
- **Vector khởi tạo**:
  ```ts
  const IV = new Uint8Array(16) // 16 bytes giá trị 0
  ```
- **Nhập khóa vào Web Crypto**:
  ```ts
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    DEFAULT_KEY_BYTES,
    { name: 'AES-CBC' },
    false,
    ['encrypt', 'decrypt']
  )
  ```
- **Xử lý chuỗi Base64**: Chuỗi mã hóa sau khi giải mã AES sẽ trả về chuỗi JSON đại diện cho đối tượng `TeacherGrade`.

### 3.2. Băm Mật khẩu MD5 Tương thích C# `Helper.GetMd5Hash`
Hệ thống sử dụng thuật toán băm MD5 tiêu chuẩn (RFC 1321) với bảng biến đổi cố định, đảm bảo chuỗi hex đầu ra giống hệt phương thức `Helper.GetMd5Hash` của C#:
```ts
export function hashLegacyPassword(password: string): string {
  // Trả về chuỗi 32 ký tự hex chữ thường
}
```
Phép kiểm tra mật khẩu sử dụng so sánh không phân biệt hoa thường tương đương `StringComparer.OrdinalIgnoreCase`.

---

## 4. Đặc tả Định dạng Canonical JSON (`.fuge.json`)

Để hỗ trợ việc lưu trữ hiện đại, trao đổi dữ liệu linh hoạt và sao lưu không phụ thuộc vào nhị phân cũ, ứng dụng cung cấp định dạng Canonical JSON:

```json
{
  "format": "fugrade.canonical",
  "schemaVersion": 1,
  "kind": "thesis-comment",
  "metadata": {
    "fileName": "SEP490_SEP490_G5_huectm.cmt",
    "sourceFormat": "cmt",
    "importedAt": "2026-09-26T15:30:00.000Z"
  },
  "data": {
    "Teacher": "huectm",
    "DT": "2026-08-28T09:15:00.000Z",
    "SubjectCode": "SEP490",
    "ClassName": "SEP490_G5",
    "Semester": "Summer 2026",
    "Password": "",
    "TitleVN": "Hệ thống quản lý điểm đồ án",
    "TitleEN": "Grading management system",
    "Content": "Đầy đủ các chức năng theo yêu cầu...",
    "Form": "Trình bày đúng quy chuẩn đồ án...",
    "Attitude": "Nghiêm túc, chủ động...",
    "Achievement": "Hoàn thành 100% mục tiêu...",
    "Limitation": "Chưa có ứng dụng di động...",
    "Conclusion": [
      {
        "Roll": "HE173247",
        "Name": "Phan Quốc Khang",
        "Agree_to_defense": "x",
        "Revised_for_the_second_defense": null,
        "Disagree_to_defense": null,
        "Note": ""
      }
    ]
  }
}
```

Các giá trị `kind` được hỗ trợ:
- `'teacher-grade'`: Bảng điểm lớp học phần (`TeacherGrade`).
- `'thesis-comment'`: Bản nhận xét đồ án (`ThesisComment`).
- `'defense-grading'`: Phiếu chấm bảo vệ (`DefenseGrading`).
- `'final-thesis-grading-items'`: Danh mục tiêu chí chấm (`{ items: FinalThesisGradingItem[] }`).

---

## 5. Xuất Báo cáo Excel Bằng SheetJS

Ứng dụng tích hợp thư viện `xlsx` (SheetJS) để xuất báo cáo mà không cần phụ thuộc vào Microsoft Office hoặc COM Interop:
- **Sheet 1 (`Summary`)**:
  - Tiêu đề cố định: `No`, `Roll Number`, `Full Name`, `Subject code`, `Class`, `Semester`, `Thesis title`, `Supervisor`, `Date-Time`, `Group Note`, `Mark`, `Scale`.
  - Các cột động tiếp theo: Tên của từng giảng viên chấm tham gia hội đồng.
  - Điểm của từng giảng viên và điểm trung bình `AvgMark` đều được làm tròn chuẩn 1 chữ số thập phân (`AwayFromZero`).
- **Sheet 2 (`Graded statistics`)**:
  - Bảng thống kê chi tiết lượt chấm: `No`, `Teacher`, `Subject`, `Group Name`, `Title`, `Supervisor`, `Time`.
- Toàn bộ được tạo trong bộ nhớ và tải xuống dưới dạng tệp `.xlsx` tiêu chuẩn mở được bằng Microsoft Excel, Google Sheets, LibreOffice.
