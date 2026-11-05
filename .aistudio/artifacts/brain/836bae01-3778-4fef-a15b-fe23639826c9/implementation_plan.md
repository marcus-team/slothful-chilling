# slothfulchilling — Web Đọc Truyện Chữ Cá Nhân & Đồng Bộ Google Drive

Một ứng dụng web đọc truyện chữ cá nhân hóa theo phong cách tài liệu GitBook tinh gọn, tối giản với bảng màu đơn sắc (monochrome trắng - đen - xám), hỗ trợ đọc đa thiết bị, đồng bộ thư mục truyện từ Google Drive và PWA cài đặt trên di động.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Dựa trên phản hồi khảo sát của bạn, các quyết định kiến trúc cốt lõi đã được xác lập:
> - **Cấu trúc lưu trữ Google Drive**: Mỗi bộ truyện là 1 thư mục riêng, bên trong chứa các file chương định dạng `.txt` hoặc `.md` (được sắp xếp theo số chương/tên file). Ứng dụng sẽ tự động duyệt cây thư mục để tạo danh mục truyện và danh sách chương.
> - **Cơ chế xác thực**: Đăng nhập tài khoản Google trực tiếp trên trình duyệt (Client-side Google OAuth với quyền đọc Google Drive), tương thích hoàn toàn khi triển khai lên Vercel hoặc AI Studio.
> - **Tiện ích đọc**: Tự động lưu tiến độ đọc (vị trí cuộn + chương đọc gần nhất), thanh điều khiển kích thước chữ / giãn dòng / phông chữ (Serif / Sans / Mono), tìm kiếm chương & lọc mục lục, điều hướng cuộn vô tận qua chương trước/sau và nút "Quay lại đầu trang".

- **Đã xác nhận**: Đồng bộ Google Drive thư mục `.txt`/`.md`, phong cách GitBook đơn sắc, Ant Design, icon chú lười `/public/assets/aistudio/slothfulface1_11858195.png` làm logo/PWA.
- **Dữ liệu ban đầu**: Cung cấp sẵn kho truyện mẫu ngoại tuyến (với các tác phẩm kinh điển và chương phong phú) để bạn có thể trải nghiệm đọc và kiểm tra tính năng ngay lập tức ngay cả khi chưa kết nối Google Drive.

---

### 1. Tổng Quan & Trải Nghiệm Cốt Lõi

- **Mục tiêu**: Cung cấp không gian đọc truyện chữ riêng tư, thư thái (slothful chilling), không quảng cáo, tối ưu cho mắt khi đọc nhiều giờ trên cả điện thoại, máy tính bảng và máy tính để bàn.
- **Phong cách GitBook**: Cột trái điều hướng danh mục truyện và danh mục chương có thể thu gọn / tìm kiếm nhanh; cột giữa là không gian đọc văn bản tiêu chuẩn (độ rộng tối ưu $65\text{–}75$ ký tự/dòng); thanh công cụ trên cùng chứa điều khiển kích cỡ chữ và trạng thái đồng bộ; thanh footer có nút cuộn nhanh về đầu trang.
- **Tiện ích cuộn qua chương (Overscroll Chapter Navigation)**:
  - Khi cuộn đến đáy trang và tiếp tục cuộn xuống (scroll/drag overscroll), xuất hiện hiệu ứng morphing indicator báo hiệu chuẩn bị chuyển sang chương tiếp theo.
  - Khi cuộn lên đỉnh trang và tiếp tục cuộn lên, xuất hiện hiệu ứng chuyển về chương trước.
  - Vị trí cuộn và chương đang đọc được tự động lưu lại tức thì (Auto-save bookmark).

---

### 2. Thiết Kế Giao Diện & Trải Nghiệm Người Dùng (UX/UI)

- **Bảng màu đơn sắc (Monochrome Grayscale Palette)**:
  - Nền chính: Trắng tinh khôi `#FFFFFF` kết hợp các lớp giấy ấm `#FAFAFA` / `#F5F5F5`.
  - Nét kẻ phân vùng: Đường hairline mảnh `rgba(0, 0, 0, 0.08)` hoặc `#E5E5E5`.
  - Màu chữ: Đen sâu `#111111` cho tiêu đề, `#262626` cho nội dung văn bản, xám `#737373` và `#A3A3A3` cho ghi chú/thời gian đọc/metadata.
  - Điểm nhấn tương tác: Đen thuần `#000000` và sắc độ xám đậm `#404040` (tuân thủ nghiêm ngặt quy tắc đơn sắc, không sử dụng màu sặc sỡ).
- **Hệ thống Typography**:
  - Tiêu đề & Wordmark: Font sans hình học hiện đại hoặc serif tinh tế kết hợp logo mặt lười *slothfulface*.
  - Nội dung đọc: Cho phép chuyển đổi tức thì giữa 3 họ phông chữ đọc sách tiêu chuẩn:
    - *Serif*: Merriweather / Lora / Source Serif (chuẩn phong cách sách in truyền thống).
    - *Sans-serif*: Plus Jakarta Sans / Inter-like clean reading (chuẩn GitBook hiện đại).
    - *Monospace*: Chữ cố định độ rộng cho phong cách ghi chú cổ điển.
  - Tùy chỉnh trực quan: Tăng/giảm cỡ chữ từ 14px đến 24px, điều chỉnh độ cao dòng (1.6x, 1.8x, 2.0x), căn lề (trái / đều 2 bên).
- **Cấu trúc màn hình (GitBook Layout)**:
  - **Top Navigation Bar**: Logo mặt lười + tên dự án `slothfulchilling`, nút mở đóng sidebar trên mobile, tìm kiếm nhanh, nút tùy biến font/size (popover Ant Design), và nút "Kết nối Google Drive" / Tài khoản Google.
  - **Left Sidebar**: 
    - Bộ chọn tiểu thuyết / truyện đang đọc (chuyển đổi giữa các truyện).
    - Thanh tìm kiếm chương nhanh (`Search chapter...`).
    - Danh sách chương phân tầng dạng Tree/Menu GitBook có highlight chương đang đọc và chỉ số tiến độ (%).
  - **Main Reading Pane**:
    - Breadcrumbs GitBook: `Truyện > Tên Truyện > Chương X: Tên Chương`.
    - Tiêu đề chương lớn, số chữ ước tính và thời gian đọc dự kiến.
    - Nội dung truyện định dạng sạch, drop-cap tinh tế ở chữ cái đầu tiên, thụt đầu dòng chuẩn mực.
    - Thanh đo tiến độ đọc thanh mảnh (Reading progress bar) gắn đỉnh màn hình.
  - **Bottom Footer & Overscroll Feedback**:
    - Nút điều hướng chương trước / chương sau rõ ràng.
    - Nút **Quay lại đầu trang** (Back to Top) mượt mà với hiệu ứng Ant Design FloatButton / Button.
    - Vùng chỉ báo Over-scroll chuyển chương mượt mà với cảm giác phản hồi tự nhiên.

---

### 3. Kiến Trúc Kỹ Thuật & Dữ Liệu

```
┌────────────────────────────────────────────────────────────────────────┐
│                        slothfulchilling Web App                        │
│             (Vite + React 19 + TypeScript + Ant Design v5)             │
├────────────────────────────────┬───────────────────────────────────────┤
│        UI & Navigation         │               Core Engine             │
│  - GitBook Layout (Sidebar)    │  - Novel & Chapter Parser (.txt / .md)│
│  - Reading Canvas & Typography │  - Overscroll Chapter Trigger Monitor │
│  - Ant Design Controls/Drawer  │  - Reading Progress & Bookmark Engine │
│  - PWA Offline Service Worker  │  - LocalStorage + Cloud Sync Bridge   │
├────────────────────────────────┴───────────────────────────────────────┤
│                           Data Providers                               │
│  ┌───────────────────────────────┐   ┌──────────────────────────────┐  │
│  │   Google Drive Integration    │   │      Built-in Library        │  │
│  │ (OAuth Token + Drive API v3)  │   │  (Classic Preloaded Novels)  │  │
│  │  - Scan novel folders         │   │  - Works offline instantly   │  │
│  │  - Read chapter txt/md files  │   │  - Zero-auth instant preview │  │
│  └───────────────────────────────┘   └──────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Phân tích tệp truyện từ Google Drive**:
  - Sử dụng Google Drive REST API v3 để liệt kê thư mục gốc được chọn hoặc thư mục con chứa truyện.
  - Mỗi folder = 1 bộ truyện (Lấy tên folder làm tên truyện).
  - Các file bên trong folder (`.txt`, `.md`) được tải nội dung trực tiếp qua API `files.get?alt=media`.
  - Thuật toán sắp xếp chương thông minh: nhận diện số chương (`Chương 1`, `Chap 02`, `001 - ...`) để sắp xếp đúng thứ tự thời gian.
- **Bộ đệm & Lưu trữ ngoại tuyến (Offline & PWA)**:
  - Cache nội dung chương đã mở vào IndexedDB / LocalStorage để bạn vẫn có thể đọc bình thường trên tàu xe khi mất sóng.
  - Cấu hình file `manifest.json`, Service Worker cache assets và gắn logo chú lười `/public/assets/aistudio/slothfulface1_11858195.png` làm icon PWA đạt chuẩn di động.

---

### 4. Kế Hoạch Các Bước Thực Hiện Chi Tiết

1. **Cấu hình & Tích hợp Workspace OAuth (Google Drive)**:
   - Gọi công cụ `set_up_oauth` với quyền `https://www.googleapis.com/auth/drive.readonly` để kích hoạt giao thức đăng nhập Google Drive phía client an toàn.
2. **Cài đặt thư viện bổ trợ**:
   - Thêm `antd` và `@ant-design/icons` phục vụ thiết kế giao diện theo yêu cầu.
   - Bổ sung cấu hình PWA với file manifest và icon `/public/assets/aistudio/slothfulface1_11858195.png`.
3. **Xây dựng hệ thống Đọc truyện & Giao diện GitBook**:
   - Xây dựng layout GitBook: thanh bên mục lục, khu vực đọc truyện, thanh công cụ điều khiển phông chữ và kích cỡ chữ.
   - Triển khai hook phát hiện cuộn quá ngưỡng (Overscroll) ở đầu và cuối trang để nhảy chương tự động kèm chỉ báo trực quan.
   - Tạo nút quay lại đầu trang ở chân trang.
4. **Xây dựng module kết nối Google Drive**:
   - Trình duyệt thư mục Google Drive, bộ quét tìm các file truyện chữ và tải nội dung chương.
   - Tích hợp kho truyện mẫu dự phòng để bạn đọc ngay mà không cần cấu hình phức tạp.
5. **Đồng bộ hóa & Kiểm thử đa thiết bị**:
   - Kiểm tra hiển thị responsive trên màn hình điện thoại, máy tính bảng và desktop.
   - Chạy build và lint xác thực mã nguồn.
