# Sơ đồ Luồng Nghiệp vụ & Kiến trúc Hệ thống FuGrade

Tài liệu mô tả chi tiết toàn bộ các luồng nghiệp vụ (workflows), kiến trúc hệ thống và luồng dữ liệu liên thông của hệ thống quản lý điểm FuGrade từ phiên bản C# WinForms gốc sang ứng dụng Web.

---

## 1. Kiến trúc Tổng thể & Mối liên hệ Giữa các Module

Trong phiên bản C# WinForms cũ (`FuGrade.exe` và `FuGradeLib.dll`), hệ thống được tổ chức thành 5 quy trình chính hoạt động xoay quanh 4 định dạng file nhị phân/mã hóa:
- `.fg`: Bảng điểm lớp học phần (AES-CBC encrypted JSON hoặc BinaryFormatter).
- `.cmt`: Bản nhận xét đồ án tốt nghiệp của Giảng viên hướng dẫn (BinaryFormatter `ThesisComment`).
- `.tef`: Phiếu chấm điểm bảo vệ đồ án của từng thành viên hội đồng (BinaryFormatter `DefenseGrading`).
- `.master`: Danh mục tiêu chí chấm đồ án theo ngành/chuyên ngành (BinaryFormatter `List<FinalThesisGradingItem>`).
- `.xlsx`: Báo cáo tổng hợp kết quả bảo vệ đồ án xuất ra Excel.

```mermaid
graph TD
    subgraph GiaiDoan1["1. Chấm điểm Lớp Học phần"]
        FG_File[".fg File (Bảng điểm lớp)"] --> FrmFuGrade["FrmFuGrade (Màn hình chính)"]
        FrmFuGrade --> EditGrade["Nhập / Sửa điểm / Comment"]
        FrmFuGrade --> ImportMark["FrmImport (Import Clipboard)"]
        FrmFuGrade --> MergeClass["Merge lớp ([All classes])"]
    end

    subgraph GiaiDoan2["2. Nhận xét Đồ án (GVHD)"]
        FrmFuGrade -- "Sinh viên <= 6 (btnComment)" --> FrmThesisComment["FrmThesisComment (Nhận xét đồ án)"]
        CMT_Existing[".cmt File sẵn có"] --> FrmThesisComment
        FrmThesisComment --> EvaluatorInput["Nhập 5 tiêu chí bắt buộc & kết luận"]
        FrmThesisComment --> SaveCMT[".cmt File (Bản nhận xét)"]
    end

    subgraph GiaiDoan3["3. Hội đồng Chấm Bảo vệ"]
        SaveCMT --> FrmDefenseGrading["FrmDefenseGrading (Hội đồng bảo vệ)"]
        Master_File[".master (FinalThesisGradingItems)"] --> FrmDefenseGrading
        FrmDefenseGrading --> FrmChooseSubject["FrmChooseSujectCode (Chọn mã môn)"]
        FrmDefenseGrading --> FrmEvaluationForm["FrmEvaluationForm (Phiếu chấm bảo vệ)"]
        FrmEvaluationForm --> CopyGroup["Copy điểm nhóm cho tất cả SV"]
        FrmEvaluationForm --> SaveTEF[".tef File (Phiếu chấm từng GV)"]
    end

    subgraph GiaiDoan4["4. Tổng hợp Kết quả Hội đồng"]
        SaveTEF --> FrmSummarize["FrmSummarizeThesisResult (Tổng hợp kết quả)"]
        FrmSummarize --> ValidateFolder["Kiểm tra tính nhất quán nhóm"]
        FrmSummarize --> CalculateResult["Tính điểm TB hội đồng (AwayFromZero)"]
        FrmSummarize --> ExportExcel[".xlsx File (Summary & Statistics)"]
    end

    subgraph GiaiDoan5["5. Quản trị Tiêu chí Chấm"]
        Master_File --> FrmMaster["FrmCreateFinalCPGradingItems"]
        FrmMaster --> EditCriteria["Thêm / Sửa / Xóa tiêu chí"]
        EditCriteria --> SaveMaster[".master File"]
    end
```

---

## 2. Luồng 1: Quản lý Bảng điểm Lớp Học phần (`.fg`)

Mục đích: Cho phép giảng viên mở file điểm lớp `.fg`, xác thực mật khẩu, xem danh sách sinh viên, nhập điểm các thành phần, import điểm từ văn bản, và lưu lại file.

```mermaid
sequenceDiagram
    autonumber
    actor GV as Giảng viên
    participant UI as FrmFuGrade
    participant Crypto as AesOperation & Helper
    participant File as Hệ thống tệp (.fg)

    GV->>UI: Chọn tệp .fg để mở (btnOpenGradingFile)
    UI->>File: Đọc chuỗi mã hóa
    UI->>Crypto: DecryptString(DEFAULT_KEY, cipherText)
    Crypto-->>UI: Trả về JSON TeacherGrade (hoặc BinaryFormatter)
    
    alt Tệp có mật khẩu (Password != "")
        UI->>UI: Mở hộp thoại FrmPassword
        GV->>UI: Nhập mật khẩu
        UI->>Crypto: VerifyMd5Hash(inputPassword, tg.Password)
        alt Mật khẩu đúng
            UI->>UI: Nạp danh sách Subject/Class vào ComboBox
        else Mật khẩu sai
            UI-->>GV: Báo lỗi "Incorrect password!" và hủy mở
        end
    else Không có mật khẩu
        UI->>UI: Nạp danh sách Subject/Class trực tiếp
    end

    GV->>UI: Chọn lớp học phần và bấm "Show"
    UI->>UI: Hiển thị bảng DataGridView (Roll, Name, Comment, các cột điểm)
    
    opt Tùy chọn gộp lớp
        GV->>UI: Chọn checkbox "chbMergeClass" ([All classes])
        UI->>UI: Gộp toàn bộ sinh viên các lớp có cùng cấu trúc thành phần điểm
    end

    opt Nhập điểm thủ công hoặc Import
        GV->>UI: Sửa điểm trực tiếp (dgvGrading_CellEndEdit)
        UI->>UI: Kiểm tra miền giá trị: 0.0 - 10.0 (hoặc 0/1 nếu cột Status)
        GV->>UI: Chuột phải chọn "Import Mark" / "Import Comments"
        UI->>UI: Mở FrmImport, dán danh sách Roll-Mark hoặc Roll-Comment
    end

    GV->>UI: Bấm "Save" (btnSave)
    alt Chưa có mật khẩu
        UI->>UI: Mở FrmSetPassword yêu cầu đặt mật khẩu
        GV->>UI: Nhập và xác nhận mật khẩu mới
        UI->>Crypto: GetMd5Hash(newPassword)
    end
    UI->>Crypto: EncryptString(DEFAULT_KEY, Serialize(tg))
    UI->>File: Ghi đè vào tệp .fg
```

---

## 3. Luồng 2: Viết Nhận xét Đồ án Tốt nghiệp (`.cmt`)

Mục đích: Giảng viên hướng dẫn viết đánh giá chi tiết cho nhóm đồ án (tối đa 6 sinh viên) và đưa ra kết luận bảo vệ cho từng thành viên.

```mermaid
flowchart TD
    Start([Bắt đầu]) --> Choice{Nguồn khởi tạo?}
    
    Choice -- "Từ màn hình điểm .fg (sinh viên <= 6)" --> AutoFill["Trích xuất danh sách sinh viên lớp<br/>Điền Teacher, SubjectCode, ClassName, Semester"]
    Choice -- "Mở file .cmt sẵn có" --> ReadFile["Đọc BinaryFormatter .cmt"]
    Choice -- "Tạo mới trống" --> InputMeta["Nhập thông tin môn & nhóm"]

    ReadFile --> CheckPass{File có mật khẩu?}
    CheckPass -- Có --> PromptPass["Nhập mật khẩu (FrmPassword)"]
    PromptPass --> VerifyPass{MD5 khớp?}
    VerifyPass -- Sai --> ExitFail([Đóng form])
    VerifyPass -- Đúng --> LoadForm["Hiển thị dữ liệu lên form"]
    CheckPass -- Không --> LoadForm
    AutoFill --> LoadForm
    InputMeta --> LoadForm

    LoadForm --> InputDetails["Giảng viên nhập thông tin:<br/>- Tên đề tài tiếng Việt & tiếng Anh<br/>- 3.1 Nội dung đồ án (Bắt buộc)<br/>- 3.2 Hình thức đồ án (Bắt buộc)<br/>- 3.3 Thái độ của sinh viên (Bắt buộc)<br/>- 4.1 Mức độ hoàn thành (Bắt buộc)<br/>- 4.2 Hạn chế của đồ án (Bắt buộc)"]

    InputDetails --> EvaluateStudents["Đánh giá kết luận từng sinh viên:<br/>(Chọn 1 trong 3 trạng thái duy nhất)<br/>[1] Đồng ý bảo vệ (Agree_to_defense = 'x')<br/>[2] Chỉnh sửa bảo vệ đợt 2 (Revised... = 'x')<br/>[3] Không đồng ý bảo vệ (Disagree... = 'x')"]

    EvaluateStudents --> ValidateSave{"Kiểm tra trước khi lưu:<br/>1. Không để trống tiêu đề & 5 mục nhận xét?<br/>2. Mọi sinh viên đều có kết luận?"}
    ValidateSave -- Chưa đạt --> ShowError["Thông báo các trường còn thiếu"]
    ShowError --> InputDetails

    ValidateSave -- Hợp lệ --> SetPassword{File chưa có mật khẩu?}
    SetPassword -- Đúng --> FormSetPass["Yêu cầu đặt mật khẩu (FrmSetPassword)"]
    FormSetPass --> HashPass["Băm mật khẩu bằng MD5"]
    SetPassword -- Đã có --> SaveBin["Tuần tự hóa nhị phân BinaryFormatter"]
    HashPass --> SaveBin

    SaveBin --> WriteFile["Ghi file .cmt<br/>(Tên mặc định: {Login}_{SubjectCode}_{Class}.cmt)"]
    WriteFile --> End([Hoàn thành])
```

---

## 4. Luồng 3: Hội đồng Chấm Bảo vệ Đồ án (`.tef`)

Mục đích: Thành viên hội đồng nạp danh sách các nhóm đồ án từ các file `.cmt`, chọn tiêu chí từ `.master`, và chấm điểm từng sinh viên.

```mermaid
sequenceDiagram
    autonumber
    actor CB as Cán bộ chấm / Hội đồng
    participant FDG as FrmDefenseGrading
    participant FEF as FrmEvaluationForm
    participant FCS as FrmChooseSujectCode
    participant File as Tệp dữ liệu (.cmt / .master / .tef)

    CB->>FDG: Chọn thư mục chứa các file .cmt (btnBrowse / btnLoadGroup)
    FDG->>File: Deserialize toàn bộ file *.cmt trong thư mục
    FDG->>FDG: Lọc sinh viên: Chỉ sinh viên có Agree_to_defense = 'x' mới đủ điều kiện bảo vệ
    FDG->>FDG: Hiển thị danh sách nhóm lên dgvGroup (Subject, Class, Title, Supervisor)

    CB->>FDG: Nhập họ tên giảng viên chấm (txtGradedBy - chỉ chữ cái không dấu)
    CB->>FDG: Chọn một nhóm đồ án và bấm "Grade" (btnGrade)

    opt Thiết lập mật khẩu cho phiên chấm
        FDG->>FDG: Mở FrmSetPassword yêu cầu đặt mật khẩu bảo vệ file .tef
    end

    FDG->>FEF: Khởi tạo FrmEvaluationForm với dữ liệu nhóm đã chọn
    FEF->>File: Đọc file MasterFile/FinalThesisGradingItems.master

    alt Có nhiều mã môn trong file Master khớp với đề tài
        FEF->>FCS: Hiển thị FrmChooseSujectCode
        CB->>FCS: Chọn mã môn cụ thể (ví dụ: SEP490 thay vì chung)
        FCS-->>FEF: Trả về FinalSubjectCode
    end

    FEF->>FEF: Xây dựng bảng điểm dgvGrade: Cột Tiêu chí, Thang điểm, Điểm nhóm, Điểm riêng từng SV
    
    opt Chấm điểm nhóm
        CB->>FEF: Nhập điểm tại cột Group mark
        CB->>FEF: Bấm "Copy group mark" để điền nhanh sang tất cả sinh viên
    end

    opt Điều chỉnh điểm cá nhân
        CB->>FEF: Điều chỉnh điểm từng tiêu chí cho từng sinh viên (phải <= Max mark của tiêu chí)
        FEF->>FEF: Tự động tính tổng điểm và cập nhật dòng Total ở đáy bảng
    end

    opt Xem nhận xét của GVHD
        CB->>FEF: Bấm "Show supervisor comment"
        FEF->>FEF: Mở FrmThesisComment ở chế độ Read-Only
    end

    CB->>FEF: Bấm "Save" (btnSave)
    FEF->>FEF: Tạo tên file: {GradedTeacher}_{SubjectCode}_{Roll1}_{Date}_{Supervisor}.tef
    FEF->>File: Serialize BinaryFormatter lưu đối tượng DefenseGrading vào file .tef
```

---

## 5. Luồng 4: Tổng hợp Kết quả Bảo vệ Đồ án & Xuất Excel (`.xlsx`)

Mục đích: Giáo vụ/Chủ nhiệm hội đồng nạp tất cả các file `.tef` của các hội đồng, kiểm tra tính toàn vẹn và xuất bảng điểm tổng hợp ra Excel.

```mermaid
flowchart TD
    A([Bắt đầu]) --> B["Chọn thư mục gốc chứa các thư mục con của từng nhóm đồ án"]
    B --> C["Quét cây thư mục (ScanDir) & liệt kê các file .tef"]
    
    C --> D{"Bấm 'Validate' hoặc 'Result':<br/>Kiểm tra tính hợp lệ thư mục"}
    D -- Không có thư mục/tệp --> Err1["Báo lỗi: Folder does not exist / No .tef files found"]
    
    D -- Có tệp .tef --> E["Đọc từng file .tef trong thư mục con"]
    E --> F{"Kiểm tra Signature nhóm:<br/>Semester - SubjectCode - ClassName - Rolls"}
    F -- Khác nhóm trong cùng 1 thư mục --> Err2["Báo lỗi: .tef files in [...] are not the same group!"]
    
    F -- Hợp lệ (Cùng nhóm) --> G["Tổng hợp dữ liệu kết quả:"]
    G --> H["1. Nhặt điểm từng tiêu chí của từng GV chấm"]
    H --> I["2. Làm tròn điểm của từng GV: Round(Mark, 1, AwayFromZero)"]
    I --> J["3. Tính điểm trung bình hội đồng: AvgMark = Round(Sum / TeacherCount, 1, AwayFromZero)"]
    J --> K["4. Ghép nối ghi chú hội đồng: '{Teacher}: {Note}; '"]
    K --> L["5. Ghi nhận trạng thái: Nếu sinh viên không bảo vệ -> 'Disagree to defense'"]
    
    L --> M["Hiển thị lên lưới xem trước dgvViewResult"]
    
    M --> N{"Bấm 'Export Excel'"}
    N --> O["Khởi tạo Workbook Excel qua COM Interop / SheetJS"]
    O --> P["Tạo Sheet 1 'Summary':<br/>No, Roll, Name, Subject, Class, Semester, Title, Supervisor, Date, Note, Mark (AvgMark), Scale, và các cột điểm riêng từng GV"]
    O --> Q["Tạo Sheet 2 'Graded statistics':<br/>Thống kê lượt chấm: No, Teacher, Subject, Group Name, Title, Supervisor, Time"]
    P & Q --> R["Mở / Tải về file Excel hoàn chỉnh"]
    R --> S([Kết thúc])
```

---

## 6. Luồng 5: Quản lý Tiêu chí Chấm Đồ án (`.master`)

Mục đích: Cho phép người quản trị cập nhật barem điểm, tiêu chí chấm và thang điểm tối đa cho từng môn tốt nghiệp.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as FrmCreateFinalCPGradingItems
    participant File as MasterFile/FinalThesisGradingItems.master

    Admin->>UI: Mở màn hình quản trị tiêu chí
    UI->>File: Đọc danh sách List<FinalThesisGradingItem>
    UI->>UI: Nạp danh sách Subject Code vào ListBox (lstAvailable)

    Admin->>UI: Chọn mã môn (SubjectCode)
    UI->>UI: Lọc và hiển thị các tiêu chí của môn đó lên dgvGradingItems
    UI->>UI: Tính tổng thang điểm (Total Scale) của môn

    alt Thêm tiêu chí mới
        Admin->>UI: Nhập SubjectCode, Major, Minor, ItemGroup, GradingItem, Scale
        Admin->>UI: Bấm Save (btnSave)
        UI->>UI: Kiểm tra: Không trùng GradingItem trong cùng mã môn; Scale > 0
        UI->>UI: Thêm vào danh sách listFTGI
    else Chỉnh sửa tiêu chí
        Admin->>UI: Chọn dòng tiêu chí cần sửa, thay đổi thông tin
        Admin->>UI: Bấm Save
        UI->>UI: Cập nhật thông tin trong listFTGI
    end

    UI->>File: BinaryFormatter Serialize ghi lại toàn bộ danh sách vào file .master
    UI-->>Admin: Hiển thị bảng tiêu chí đã được cập nhật
```

---

## 7. Sơ đồ Luồng Dữ liệu Liên thông Giữa các Tệp (Data Lineage)

```mermaid
flowchart LR
    subgraph InputFiles["Tệp Đầu vào"]
        FG[".fg (TeacherGrade)<br/>AES-CBC Encrypted"]
        MASTER[".master (Criteria)<br/>BinaryFormatter"]
    end

    subgraph Step1["Bước 1: Chấm điểm Lớp"]
        FG --> |"Trích xuất sinh viên"| FG_Process["Chấm điểm học phần<br/>& Xác định nhóm đồ án"]
    end

    subgraph Step2["Bước 2: Nhận xét GVHD"]
        FG_Process --> |"Export / Tạo mới"| CMT[".cmt (ThesisComment)<br/>BinaryFormatter"]
    end

    subgraph Step3["Bước 3: Hội đồng Bảo vệ"]
        CMT --> |"Nhúng SupervisorComment"| TEF_Process["Hội đồng chấm điểm<br/>(Điểm nhóm + Điểm riêng)"]
        MASTER --> |"Barem điểm & tiêu chí"| TEF_Process
        TEF_Process --> |"Từng thành viên xuất file"| TEF[".tef (DefenseGrading)<br/>BinaryFormatter"]
    end

    subgraph Step4["Bước 4: Tổng hợp"]
        TEF --> |"Tập hợp nhiều file .tef"| SUM_Process["Tổng hợp & Làm tròn điểm<br/>(AwayFromZero)"]
        SUM_Process --> XLSX[".xlsx (Báo cáo tốt nghiệp)<br/>2 Sheets: Summary & Statistics"]
    end
```
