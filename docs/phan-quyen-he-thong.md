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

| Mục sidebar | sales | warehouse | admin | cs | Lý do |
|---|:---:|:---:|:---:|:---:|---|
| Tổng quan | ✅ | ✅ | ✅ | ✅ | Ai cũng cần xem dashboard chung |
| Sản phẩm | ✅ | ❌ | ✅ | ❌ | Sales tạo/sửa sản phẩm |
| Kho hàng | ❌ | ✅ | ✅ | ❌ | Warehouse quản lý tồn kho, duyệt phiếu nhập |
| Đơn hàng | ✅ | ✅ | ✅ | ❌ | Sales xử lý đơn, warehouse đóng gói/xuất kho |
| Marketing | ✅ | ❌ | ✅ | ❌ | Voucher/flash sale là quyết định kinh doanh |
| Khách hàng | ❌ | ❌ | ✅ | ✅ | Quản lý khách hàng thuộc CRM, do CS phụ trách |
| Báo cáo | ❌ | ❌ | ✅ | ❌ | Báo cáo demographic — cấp quản trị |
| Nhân viên | ❌ | ❌ | ✅ | ❌ | Chỉ admin tạo/sửa nhân viên |

**Admin luôn thấy mọi mục** — quyền cao nhất trong hệ thống.

> ⚠️ Bảng này là **đề xuất mặc định** tôi tự suy ra từ mô tả nghiệp vụ đã thống nhất
> trước đó (VD: "CRUD Product do nhân viên bán hàng", "CRUD Warehouse do nhân viên
> kho"...) — **chưa được nhóm chốt chính thức**. Đây chính là phần cần bàn bạc.

## 3. Cách chặn đang thực thi (đã code + test thật)

| Chặn gì | Ở đâu | Đã verify |
|---|---|---|
| Buyer không vào được `/admin` | Frontend (`RequireStaff`) | ✅ |
| Mọi API cần đăng nhập (trừ `/health`, `/auth/*`) | Backend (`SecurityConfig`) | ✅ |
| Chỉ `department=admin` gọi được API `/employees/**` | Backend — chặn cứng, không thể bypass qua URL/DevTools | ✅ |
| Sidebar + route admin lọc theo department | Frontend (`access.ts` + `RequireDepartment`) | ✅ |
| Không cho đổi department của **admin cuối cùng** | Backend (`EmployeeService`) | ✅ |

## 4. Giới hạn hiện tại — cần nhóm biết trước khi code Phase 2-5

- **Bảng phân quyền ở mục 2 mới chặn ở frontend** (ẩn sidebar + chặn route React). **Backend của các module Phase 2-5 (Product, Order, Marketing, CRM...) chưa tồn tại nên chưa thể chặn theo department ở tầng API** — giống cách `/employees` đã làm. Đây là việc bắt buộc phải làm khi code từng module, không phải chỉ ẩn UI là đủ (ẩn UI không ngăn được người gọi thẳng API bằng Postman/curl).
- `PATCH /employees/{id}` hiện ghi đè toàn bộ field được gửi lên (không phải "chỉ sửa field có gửi") — nếu gọi thiếu field, field đó bị set về rỗng. Cần lưu ý khi code các API PATCH khác ở Phase 2-5 để thống nhất quy ước (ghi đè toàn bộ hay chỉ sửa field có gửi).
- Chưa có khái niệm "trưởng bộ phận" hay quyền trung gian giữa `staff` thường và `admin` — chỉ 2 mức phẳng. Nếu nhóm cần thêm cấp bậc (VD: "trưởng phòng sales" có quyền hơn "nhân viên sales"), cần thiết kế thêm.

## 5. Việc cần nhóm chốt

1. Bảng phân quyền mục 2 có đúng ý muốn của nhóm không, hay cần đổi (VD: warehouse có nên thấy Marketing không, CS có cần thấy Đơn hàng không...)?
2. Khi code Phase 2-5, có thống nhất **mỗi API mới đều phải khai báo rõ department nào được gọi** (theo đúng pattern `/employees` đã làm), hay chấp nhận tạm thời chỉ chặn ở frontend trước, bổ sung backend sau?
