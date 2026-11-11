# Phân quyền hệ thống — Chợ Tốt Mua

> Tài liệu ngắn gọn để nhóm bàn bạc & chốt trước khi làm tiếp Phase 2-5. Chi tiết kỹ
> thuật xem code thật tại `web/src/admin/access.ts` (cấu hình duy nhất) và
> `backend/.../SecurityConfig.java`.

## 1. Hai lớp phân quyền

**Lớp 1 — `User.role`: ai được vào khu vực nào**

| Giá trị | Vào được |
|---|---|
| `buyer` | Chỉ web khách hàng |
| `staff` | Web khách hàng **+** khu `/admin` |

**Lớp 2 — `Employee.department`: staff được làm gì trong khu admin**

| Department | Vai trò |
|---|---|
| `sales` | Bán hàng |
| `warehouse` | Kho |
| `admin` | Quản trị hệ thống |
| `cs` | Chăm sóc khách hàng |

## 2. Bảng phân quyền từng mục admin (đang áp dụng)

> ✅ **Đã chốt (06/11/2026) — phân tách nhiệm vụ:** `admin` là **quản trị hệ thống**, chỉ quản lý
> tài khoản nhân viên và xem nhật ký thao tác; **không làm nghiệp vụ** (không sửa sản phẩm, duyệt
> hoàn tiền hay khoá khách hàng). Mỗi nghiệp vụ thuộc đúng một bộ phận, bộ phận khác chỉ được xem
> khi cần cho công việc. Mỗi bộ phận chỉ xem báo cáo của mình (không có vai trò "ban giám đốc").

✅ toàn quyền · 👁 chỉ xem · ❌ không có quyền

| Mục sidebar | sales | warehouse | cs | admin | Lý do |
|---|:---:|:---:|:---:|:---:|---|
| Tổng quan | ✅ | ✅ | ✅ | ✅ | Mỗi bộ phận thấy số liệu của mình; admin thấy số tài khoản nhân viên |
| Sản phẩm | ✅ | 👁 | ❌ | ❌ | Bán hàng tạo/sửa; kho xem để biết biến thể khi nhập hàng |
| Kho hàng, phiếu nhập | ❌ | ✅ | ❌ | ❌ | Kho quản lý tồn kho, duyệt phiếu nhập |
| Đơn hàng | ✅ | ✅ | 👁 | ❌ | Bán hàng xác nhận / thanh toán / hoá đơn; kho đóng gói, giao; CSKH tra cứu khi khách hỏi |
| Hoàn tiền / trả hàng | ❌ | ❌ | ✅ | ❌ | CSKH duyệt và ghi nhận chuyển khoản |
| Marketing (voucher, flash sale) | ✅ | ❌ | ❌ | ❌ | Quyết định kinh doanh |
| Khách hàng | ❌ | ❌ | ✅ | ❌ | Quản lý khách hàng thuộc CRM, do CSKH phụ trách |
| Đánh giá sản phẩm (phản hồi) | ❌ | ❌ | ✅ | ❌ | Chăm sóc khách là việc của CSKH |
| Báo cáo quản trị | ✅ doanh thu | ✅ nhập–xuất–tồn | ❌ | ❌ | Mỗi bộ phận xem báo cáo của mình |
| Báo cáo khách hàng | ❌ | ❌ | ✅ | ❌ | |
| Nhân viên | ❌ | ❌ | ❌ | ✅ | Tạo tài khoản, phân bộ phận, khoá/mở, cấp mật khẩu tạm |
| Nhật ký thao tác | ❌ | ❌ | ❌ | 👁 | Chỉ xem, không sửa/xoá được (append-only) |

### 2.1 Phân quyền chức năng phân hệ CRM (module `modules/crm`)

| Chức năng CRM | sales | warehouse | cs | admin | Ghi chú |
|---|:---:|:---:|:---:|:---:|---|
| Hồ sơ khách hàng, LTV / RFM | ❌ | ❌ | ✅ | ❌ | |
| Thêm / khoá / xoá mềm / khôi phục khách hàng | ❌ | ❌ | ✅ | ❌ | Khôi phục trước đây chỉ admin, nay chuyển cho CSKH |
| Cấp mật khẩu tạm cho khách | ❌ | ❌ | ✅ | ❌ | Phải xác minh đúng chủ tài khoản trước; thao tác được ghi nhật ký |
| Hội thoại / ticket, assign, escalate | ❌ | ❌ | ✅ | ❌ | Chỉ nhân viên CSKH được nhận ticket |
| Khảo sát: tạo, gửi, xem kết quả | ❌ | ❌ | ✅ | ❌ | |
| Gợi ý sản phẩm cho khách | ❌ | ❌ | ✅ | ❌ | Khách xem gợi ý của chính mình |
| Phân khúc khách hàng: tạo, sửa, xoá | ✅ | ❌ | ✅ | ❌ | CSKH và bán hàng cùng chọn đối tượng gửi khảo sát và chiến dịch |
| Phân khúc khách hàng: xem | ✅ | ❌ | ✅ | ❌ | |
| Chiến dịch, phễu chuyển đổi, tỷ lệ mở thư | ✅ | ❌ | ✅ | ❌ | CSKH theo dõi và vận hành chiến dịch chăm sóc |
| Xem hộp thư của khách | ❌ | ❌ | ✅ | ❌ | Ai cũng đọc được hộp thư của chính mình |
| Báo cáo khách hàng | ❌ | ❌ | ✅ | ❌ | |
| Nhật ký thao tác (audit log) | ❌ | ❌ | ❌ | 👁 | Chỉ quản trị hệ thống |

Các quy tắc giữ nguyên: không tự khoá mình, không khoá / hạ quyền admin cuối cùng còn hoạt động,
không tự cấp mật khẩu tạm cho mình (đổi mật khẩu trong trang tài khoản).

## 3. Cách chặn đang thực thi (đã code + test thật)

| Chặn gì | Ở đâu | Đã verify |
|---|---|---|
| Buyer không vào được `/admin` | Frontend (`RequireStaff`) | ✅ |
| Mọi API cần đăng nhập (trừ `/health`, `/auth/*`) | Backend (`SecurityConfig`) | ✅ |
| Chỉ `department=admin` gọi được API `/employees/**` | Backend — chặn cứng, không thể bypass qua URL/DevTools | ✅ |
| Admin bị từ chối (403) ở mọi API nghiệp vụ: sản phẩm, kho, đơn hàng, hoàn tiền, khách hàng, CRM, báo cáo | Backend (`SecurityConfig`, `@PreAuthorize`, kiểm tra trong service) | ✅ |
| Sidebar + route admin lọc theo department | Frontend (`access.ts` + `RequireDepartment`) | ✅ |
| Không cho đổi department của **admin cuối cùng còn hoạt động** | Backend (`EmployeeService`) | ✅ |
| Khoá nhân viên: không tự khoá mình, không khoá admin cuối cùng còn hoạt động | Backend (`EmployeeService`) | ✅ |
| Tài khoản bị khoá không đăng nhập được, token cũ mất hiệu lực trong khoảng 30 giây | Backend (`AuthService`, `JwtAuthenticationFilter`) | ✅ |

## 4. Giới hạn hiện tại — cần nhóm biết trước khi code Phase 2-5

- **Bảng phân quyền ở mục 2 mới chặn ở frontend** (ẩn sidebar + chặn route React). **Backend của các module Phase 2-5 (Product, Order, Marketing, CRM...) chưa tồn tại nên chưa thể chặn theo department ở tầng API** — giống cách `/employees` đã làm. Đây là việc bắt buộc phải làm khi code từng module, không phải chỉ ẩn UI là đủ (ẩn UI không ngăn được người gọi thẳng API bằng Postman/curl).
- `PATCH /employees/{id}` hiện ghi đè toàn bộ field được gửi lên (không phải "chỉ sửa field có gửi") — nếu gọi thiếu field, field đó bị set về rỗng. Cần lưu ý khi code các API PATCH khác ở Phase 2-5 để thống nhất quy ước (ghi đè toàn bộ hay chỉ sửa field có gửi).
- Chưa có khái niệm "trưởng bộ phận" hay quyền trung gian giữa `staff` thường và `admin` — chỉ 2 mức phẳng. Nếu nhóm cần thêm cấp bậc (VD: "trưởng phòng sales" có quyền hơn "nhân viên sales"), cần thiết kế thêm.

## 5. Việc cần nhóm chốt

1. Bảng phân quyền mục 2 có đúng ý muốn của nhóm không, hay cần đổi (VD: warehouse có nên thấy Marketing không, CS có cần thấy Đơn hàng không...)?
2. Khi code Phase 2-5, có thống nhất **mỗi API mới đều phải khai báo rõ department nào được gọi** (theo đúng pattern `/employees` đã làm), hay chấp nhận tạm thời chỉ chặn ở frontend trước, bổ sung backend sau?
