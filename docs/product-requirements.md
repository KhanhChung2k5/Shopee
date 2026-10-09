# Product Requirements Document (PRD) — Chợ Tốt Mua

> Tài liệu yêu cầu sản phẩm, tổng hợp từ [`project-overview.md`](./project-overview.md)
> (luồng hoạt động), [`chuc-nang-chinh-phu.md`](./chuc-nang-chinh-phu.md) (ưu tiên chức
> năng), [`phan-quyen-he-thong.md`](./phan-quyen-he-thong.md) (RBAC) và trạng thái code
> thực tế tại thời điểm viết (2026-10-05). Khi tài liệu này và code thật khác nhau, **code
> là nguồn sự thật** — cập nhật lại PRD, không ngược lại.

## 1. Tổng quan sản phẩm

**Chợ Tốt Mua** là hệ thống bán lẻ trực tuyến cho **một doanh nghiệp bán lẻ duy nhất**
(không phải sàn đa gian hàng), chuyên mặt hàng **tay cầm chơi game và đĩa game**, tích hợp
sẵn module **CRM** (chăm sóc khách hàng) trong cùng nền tảng.

**Mục tiêu sản phẩm:**
- Cho phép khách hàng tự duyệt, đặt mua, thanh toán và theo dõi đơn hàng online.
- Cho nhân viên nội bộ (kinh doanh/kho/CSKH/quản trị) một trang quản trị duy nhất để vận
  hành toàn bộ nghiệp vụ, phân quyền rõ theo phòng ban.
- Giữ chân khách hàng qua các công cụ CRM: phân khúc, chiến dịch, khảo sát, hỗ trợ
  ticket/chat.

**Bối cảnh dự án:** đây đồng thời là đồ án môn **Công nghệ phần mềm (CNPM)** — xây dựng hệ
thống đầy đủ — và môn **Hệ thống thông tin doanh nghiệp (HTTTDN)** — phân tích sâu **riêng
phân hệ CRM** (xem [`httttdn-phan1-baocao.md`](./httttdn-phan1-baocao.md)). PRD này mô tả
**toàn bộ hệ thống**, CRM chỉ là 1 trong 5 domain.

## 2. Thành phần hệ thống

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Web app | React + Vite | Khách hàng mua sắm + trang quản trị Admin (`/admin`) |
| Mobile app | Flutter | Khách hàng mua sắm trên di động |
| Backend API | Spring Boot + JPA/Hibernate | Xử lý nghiệp vụ, REST API |
| CSDL | PostgreSQL (Neon, managed) | 39 bảng, 5 domain nghiệp vụ, migration bằng Flyway |

## 3. Đối tượng người dùng

| Vai trò | `User.role` | `Employee.department` | Mô tả |
|---|---|---|---|
| Khách hàng (Buyer) | `buyer` | — | Mua sắm trên web/mobile, không vào được `/admin` |
| Nhân viên Kinh doanh | `staff` | `sales` | Quản lý sản phẩm, giá, khuyến mãi, xử lý đơn |
| Nhân viên Kho vận | `staff` | `warehouse` | Quản lý tồn kho, đóng gói, xuất kho |
| Nhân viên CSKH | `staff` | `cs` | Xử lý ticket/chat, duyệt đổi trả, tạo khảo sát, quản lý khách hàng |
| Quản trị viên | `staff` | `admin` | Toàn quyền — tài khoản, phân quyền, báo cáo, nhân viên |

Chi tiết ma trận quyền từng mục xem [`phan-quyen-he-thong.md`](./phan-quyen-he-thong.md).

## 4. Phạm vi (Scope)

### 4.1 Trong phạm vi (In scope)

5 domain nghiệp vụ, tương ứng 5 phase triển khai backend:

1. **Identity** — tài khoản, đăng ký/đăng nhập, phân quyền, hồ sơ, địa chỉ, nhân viên.
2. **Catalog** — danh mục, sản phẩm/biến thể, kho hàng, tồn kho.
3. **Order** — giỏ hàng, đặt hàng/checkout, thanh toán, giao hàng, đổi trả/hoàn tiền.
4. **Marketing** — voucher, flash sale, tích điểm thành viên.
5. **CRM** — quản lý khách hàng, phân khúc, chiến dịch, hỗ trợ ticket/chat, khảo sát, báo
   cáo nhân khẩu học.

### 4.2 Ngoài phạm vi (Out of scope)

- Sàn thương mại điện tử đa gian hàng (multi-vendor) — chỉ 1 doanh nghiệp bán hàng.
- Tích hợp cổng thanh toán thật của bên thứ 3 (Momo/VNPay/Stripe...) — thanh toán online
  mô phỏng trong phạm vi đồ án.
- Tích hợp API thật của đơn vị vận chuyển — trạng thái giao hàng cập nhật thủ công bởi
  nhân viên kho, không gọi API hãng vận chuyển.
- Phân hệ HRM, MRP đầy đủ (chấm công, tuyển dụng, hoạch định nguyên vật liệu) — ngoài phạm
  vi cả 2 môn học.
- Ứng dụng di động cho nhân viên nội bộ — trang quản trị chỉ có bản web.

## 5. Yêu cầu chức năng

Mỗi mục ghi theo dạng **User story** + **Acceptance criteria**, gắn nhãn độ ưu tiên:
**[Core]** bắt buộc phải có, **[Supporting]** có thể cắt giảm nếu thiếu thời gian (xem lý
do xếp loại đầy đủ tại [`chuc-nang-chinh-phu.md`](./chuc-nang-chinh-phu.md)).

### 5.1 Identity — Tài khoản & phân quyền

**[Core] Đăng ký / Đăng nhập**
> Là khách hàng, tôi muốn đăng ký tài khoản bằng email/mật khẩu và đăng nhập, để lưu lại
> lịch sử mua hàng và thông tin cá nhân.
- Mật khẩu được băm (BCrypt), không lưu plaintext.
- Đăng nhập trả về JWT, hết hạn sau khoảng thời gian cấu hình được.
- Sau 5 lần đăng nhập sai liên tiếp trong 1 khoảng thời gian, tài khoản bị khoá tạm (rate
  limit) để chống brute-force.
- Email trùng bị từ chối với thông báo rõ ràng.

**[Core] Phân quyền theo vai trò & phòng ban**
> Là quản trị viên, tôi muốn mỗi nhân viên chỉ thấy đúng mục họ được phân công trong trang
> quản trị, để tránh thao tác nhầm ngoài phạm vi công việc.
- `buyer` không truy cập được bất kỳ route `/admin` nào (chặn cả frontend lẫn backend).
- Mỗi API nhạy cảm (vd. `/employees/**`) chỉ `department=admin` gọi được — chặn cứng ở
  backend, không thể bypass qua gọi thẳng API.
- Sidebar/route admin ẩn theo đúng bảng phân quyền từng `department`.

**[Core] Quản lý hồ sơ cá nhân & địa chỉ**
> Là khách hàng, tôi muốn cập nhật thông tin cá nhân và quản lý nhiều địa chỉ giao hàng, để
> chọn nhanh khi đặt hàng.

**[Core] Quản lý nhân viên nội bộ**
> Là quản trị viên, tôi muốn thêm/sửa/khoá tài khoản nhân viên và gán phòng ban, để kiểm
> soát ai được vào hệ thống quản trị.
- Không cho đổi `department` của **admin cuối cùng** (tránh hệ thống mất hết quyền quản
  trị).

**[Core] Quản lý khách hàng (thêm/khoá/xoá mềm)**
> Là nhân viên CSKH, tôi muốn thêm khách hàng mới (hỗ trợ qua điện thoại), khoá hoặc xoá
> mềm tài khoản khách hàng, để xử lý các trường hợp vi phạm hoặc yêu cầu từ khách.
- Xoá là xoá mềm (`User.status = deleted`), không xoá vật lý — không có chiều quay lại từ
  `deleted`.

### 5.2 Catalog — Sản phẩm & kho

**[Core] Quản lý sản phẩm & biến thể**
> Là nhân viên kinh doanh, tôi muốn tạo/sửa sản phẩm kèm các biến thể (màu, phiên bản...),
> để khách hàng chọn đúng mặt hàng mình cần.

**[Core] Quản lý tồn kho**
> Là nhân viên kho vận, tôi muốn hệ thống trừ tồn kho ngay khi đơn được tạo và ghi lại lịch
> sử nhập/xuất, để số liệu tồn kho luôn khớp thực tế.
- Không cho đặt hàng vượt quá tồn kho khả dụng — trả lỗi rõ ràng cho khách khi hết hàng.

**[Supporting] Quản lý danh mục sản phẩm** — cây danh mục phân cấp, hỗ trợ tìm kiếm/lọc.

**[Supporting] Quản lý kho đa chi nhánh + phiếu nhập hàng** — hệ thống vẫn chạy được với 1
kho đơn giản nếu không kịp làm đa chi nhánh.

### 5.3 Order — Đơn hàng & thanh toán

**[Core] Giỏ hàng**
> Là khách hàng, tôi muốn thêm/sửa/xoá sản phẩm trong giỏ trước khi đặt hàng.

**[Core] Đặt hàng / Checkout**
> Là khách hàng, tôi muốn chọn địa chỉ giao hàng, phương thức thanh toán và xác nhận đơn,
> để hoàn tất một giao dịch mua.
- Giá sản phẩm được **snapshot** vào `OrderItem` tại thời điểm đặt — thay đổi giá sau đó
  không ảnh hưởng đơn đã tạo.
- Kiểm tra tồn kho tại thời điểm tạo đơn; nếu không đủ, không tạo đơn và báo lỗi.

**[Core] Thanh toán**
> Là khách hàng, tôi muốn thanh toán online (ví nội bộ/chuyển khoản) hoặc chọn COD, để
> hoàn tất đơn hàng theo cách tiện nhất.

**[Core] Theo dõi trạng thái & giao hàng**
> Là khách hàng, tôi muốn xem đơn của mình đang ở trạng thái nào (chờ xác nhận → đã xác
> nhận → đang giao → đã giao), để yên tâm chờ hàng.
- `Order.status` chuyển một chiều, không quay ngược tuỳ ý: `pending → confirmed → shipping
  → delivered`, hoặc `pending/confirmed → cancelled`.

**[Supporting] Ví điện tử nội bộ** — 1 trong nhiều phương thức thanh toán, không bắt buộc
vì đã có COD/chuyển khoản.

**[Supporting] Đổi trả & hoàn tiền**
> Là khách hàng, tôi muốn gửi yêu cầu đổi trả kèm lý do cho 1 sản phẩm đã mua, để được hoàn
> tiền nếu yêu cầu hợp lệ.
- Luồng duyệt: `requested → approved/rejected → refunded` (nếu approved), do nhân viên
  CSKH xử lý. Hoàn tiền cộng vào `Wallet` nội bộ của khách.

### 5.4 Marketing — Khuyến mãi

**[Supporting] Voucher / Mã giảm giá** — áp dụng theo điều kiện (đơn tối thiểu, hạn dùng).

**[Supporting] Flash Sale** — giảm giá theo sản phẩm trong khung giờ giới hạn.

**[Supporting] Tích điểm thành viên** — tích điểm theo giá trị đơn hàng, xếp hạng thành
viên (`loyaltyTier`).

### 5.5 CRM — Chăm sóc khách hàng

> Phân tích nghiệp vụ sâu (BFD/DFD đầy đủ) xem tại
> [`httttdn-so-do-bfd-dfd.md`](./httttdn-so-do-bfd-dfd.md).

**[Supporting] Phân khúc khách hàng**
> Là nhân viên CSKH, tôi muốn định nghĩa quy tắc phân khúc (vd. theo LTV, tần suất mua) và
> hệ thống tự gán khách hàng vào đúng phân khúc, để nhắm mục tiêu chiến dịch chính xác hơn.

**[Supporting] Chiến dịch & thông báo**
> Là nhân viên CSKH, tôi muốn gửi nội dung (ưu đãi, khảo sát) tới một phân khúc khách hàng
> qua email/SMS/push, để tăng hiệu quả marketing so với gửi đại trà.

**[Supporting] Hỗ trợ / Ticket / Chat**
> Là khách hàng, tôi muốn gửi phản hồi/yêu cầu hỗ trợ và nhận trả lời từ nhân viên CSKH qua
> hội thoại, để được giải quyết vấn đề nhanh chóng.
- Hệ thống phân công hội thoại cho nhân viên theo tải việc (không phải random/thủ công
  hoàn toàn).

**[Supporting] Khảo sát khách hàng**
> Là nhân viên CSKH, tôi muốn tạo bộ câu hỏi khảo sát, gửi tới 1 phân khúc, và xem thống kê
> tổng hợp kết quả, để hiểu rõ hơn nhu cầu khách hàng.

**[Supporting] Báo cáo nhân khẩu học** — thống kê khách hàng theo độ tuổi/giới tính/ngành
hàng ưa thích/trạng thái tài khoản.

**[Core] Đánh giá & phản hồi sản phẩm**
> Là khách hàng, tôi muốn đánh giá (sao + nhận xét) sản phẩm đã mua, để chia sẻ trải nghiệm
> và giúp khách khác tham khảo. *(Xếp Core vì là yêu cầu bắt buộc của môn HTTTDN, không
> phải vì ảnh hưởng tới khả năng vận hành giao dịch.)*

## 6. Yêu cầu phi chức năng

| Hạng mục | Yêu cầu |
|---|---|
| Bảo mật mật khẩu | BCrypt, không log/lưu plaintext |
| Bảo mật API | JWT bắt buộc cho mọi endpoint trừ `/health`, `/auth/*`; rate-limit đăng nhập sai |
| Toàn vẹn dữ liệu | Migration quản lý bằng Flyway, không sửa schema tay trên production |
| Phân quyền | Chặn ở **cả** frontend (ẩn UI) **và** backend (chặn API) — ẩn UI không được tính là đủ |
| Khả năng mở rộng | Kiến trúc module hoá theo domain (`identity/catalog/order/marketing/crm`), mỗi domain độc lập về entity/repository/controller |
| Sao lưu dữ liệu | Có script backup/restore CSDL (`scripts/backup-db.sh`, `scripts/restore-db.sh`) — chi tiết tại [`backup-strategy.md`](./backup-strategy.md) |
| Đóng gói & triển khai | Backend đóng gói bằng Docker (`backend/Dockerfile`), biến môi trường tách theo profile (`application-prod.yml`) |

## 7. Trạng thái triển khai hiện tại

> Đối chiếu trực tiếp với code tại thời điểm viết — không copy từ tài liệu cũ, vì
> `project-overview.md` mục 12 đã lỗi thời (ghi "backend thật chưa làm", thực tế domain
> Identity đã xong).

| Phần | Trạng thái |
|---|---|
| Thiết kế CSDL (39 bảng, 5 domain) + migration Flyway | ✅ Hoàn thành |
| Backend — domain **Identity** (Auth, User, Employee, Address, Customer) | ✅ Hoàn thành — API thật, có rate-limit đăng nhập, E2E test |
| Backend — domain **Catalog/Order/Marketing/CRM** | ❌ Chưa làm — mới có package khung, chưa có entity/controller |
| Web — giao diện khách hàng (trang chủ, danh mục, giỏ hàng, checkout...) | ✅ Giao diện xong, **đang chạy trên dữ liệu mẫu**, chưa nối API thật (trừ Identity) |
| Web — giao diện Admin (sản phẩm, kho, đơn hàng, marketing, khách hàng, báo cáo, nhân viên) | ✅ Giao diện xong (dữ liệu mẫu, trừ Employee đã nối API thật); phân quyền theo department đã chặn ở frontend |
| Mobile app (Flutter) — các màn hình chính + đăng nhập | ✅ Giao diện xong; đăng nhập/tài khoản đã nối API Identity thật |
| Đóng gói Docker backend | ✅ Hoàn thành |
| Test tự động backend (unit/E2E) | ✅ Có cho domain Identity; chưa có cho domain khác (vì domain khác chưa code) |

## 8. Ràng buộc & giả định

- CSDL dùng chung giữa các thành viên (Neon managed Postgres) — mọi thay đổi schema phải
  qua Flyway migration, không sửa tay trực tiếp (xem
  [`shared-database-setup.md`](./shared-database-setup.md)).
- Thứ tự triển khai backend thật theo domain còn phụ thuộc quyết định của nhóm (đề xuất:
  Identity → Catalog → Order → Marketing → CRM, theo đúng thứ tự phụ thuộc dữ liệu).
- Bảng phân quyền chi tiết ở mục 2 của `phan-quyen-he-thong.md` là **đề xuất mặc định**,
  chưa được nhóm chốt chính thức.

## 9. Tài liệu liên quan

| Tài liệu | Nội dung |
|---|---|
| [`project-overview.md`](./project-overview.md) | Luồng hoạt động, sequence diagram, kiến trúc kỹ thuật |
| [`chuc-nang-chinh-phu.md`](./chuc-nang-chinh-phu.md) | Phân loại & lý do ưu tiên chức năng chính/phụ |
| [`phan-quyen-he-thong.md`](./phan-quyen-he-thong.md) | Chi tiết RBAC, giới hạn hiện tại |
| `crm-ecommerce-class-diagram.md` (gốc dự án) | Class diagram đầy đủ — nguồn sự thật về dữ liệu |
| [`httttdn-phan1-baocao.md`](./httttdn-phan1-baocao.md) | Phân tích HTTTDN chuyên sâu phân hệ CRM (BFD/DFD) |
| [`httttdn-so-do-bfd-dfd.md`](./httttdn-so-do-bfd-dfd.md) | BFD/DFD mức 0–2 phân hệ CRM (bản text tham khảo; bản nộp là `.drawio`) |
| [`backup-strategy.md`](./backup-strategy.md) | Chiến lược sao lưu CSDL |
| [`shared-database-setup.md`](./shared-database-setup.md) | Hướng dẫn kết nối CSDL dùng chung |
