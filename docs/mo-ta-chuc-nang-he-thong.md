# I. Tên đề tài

**Xây dựng hệ thống thương mại điện tử "Chợ Tốt Mua"** — nền tảng bán lẻ trực tuyến chuyên tay cầm chơi game và đĩa game, tích hợp quản lý sản phẩm, khách hàng (CRM) và xử lý hóa đơn/đơn hàng (Order).

---

# II. Chức năng chính

1. Quản lý danh mục sản phẩm (Category)
2. Quản lý sản phẩm (Product)
3. Quản lý biến thể sản phẩm & giá bán (Product Variant)
4. Quản lý giỏ hàng (Cart)
5. Tạo hóa đơn/đơn hàng từ giỏ hàng (Checkout)
6. Xác nhận / Huỷ đơn hàng
7. Cập nhật thông tin đóng gói & vận chuyển
8. Cập nhật mã vận đơn & trạng thái giao hàng (Tracking)
9. Tra cứu lịch sử & chi tiết hóa đơn
10. Quản lý khách hàng (Customer — CRM)

---

# III. Mô tả chi tiết các chức năng chính

## 1. Quản lý danh mục sản phẩm (Category)

**Mô tả:** Cho phép nhân viên (bộ phận bán hàng/admin) thêm, sửa, xóa danh mục sản phẩm, hỗ trợ danh mục cha-con (ví dụ: "Tay cầm" → "Tay cầm PS5").

**Thao tác CRUD:**
- **Thêm:** nhập tên danh mục, hệ thống tự sinh `slug` (định danh URL duy nhất); có thể chọn danh mục cha.
- **Sửa:** đổi tên, đổi slug, đổi danh mục cha.
- **Xóa:** chỉ cho phép xóa khi không còn sản phẩm nào thuộc danh mục đó (tránh dữ liệu mồ côi).

**Ràng buộc dữ liệu:**
- `name`: bắt buộc (NOT NULL).
- `slug`: bắt buộc, **duy nhất toàn hệ thống** (UNIQUE) — không được trùng giữa 2 danh mục.
- `parent_id`: tham chiếu khóa ngoại tới chính bảng `categories` (cho phép cây danh mục nhiều cấp); có thể NULL (danh mục gốc).

---

## 2. Quản lý sản phẩm (Product)

**Mô tả:** Nhân viên bán hàng tạo/sửa thông tin sản phẩm (tay cầm, đĩa game, phụ kiện), kèm ảnh minh họa, trạng thái hiển thị công khai.

**Thao tác CRUD:**
- **Thêm:** nhập tên, mô tả, loại sản phẩm (`game_disc` | `controller` | `accessory`), chọn danh mục, upload ảnh (lưu dạng mảng URL theo thứ tự hiển thị).
- **Sửa:** cập nhật mọi trường trên, đổi trạng thái `draft` (nháp) ↔ `published` (đã đăng).
- **Xóa:** xóa sản phẩm sẽ **xóa theo tầng (CASCADE)** toàn bộ biến thể (`product_variants`) thuộc sản phẩm đó.

**Ràng buộc dữ liệu:**
- `name`: bắt buộc (NOT NULL).
- `status`: mặc định `draft`, chỉ nhận 2 giá trị `draft`/`published`.
- `product_type`: mặc định `accessory`, nhận 1 trong 3 giá trị `game_disc`/`controller`/`accessory`.
- Các trường `publisher`, `genre`, `age_rating` **chỉ có ý nghĩa khi `product_type = game_disc`**; `connection_type`, `warranty_months` chỉ dùng cho `controller`/`accessory` — đây là ràng buộc nghiệp vụ (business rule), được validate ở tầng ứng dụng vì khác loại sản phẩm có bộ thuộc tính khác nhau.
- `category_id`: khóa ngoại tới `categories`, có thể NULL (sản phẩm chưa phân loại).

---

## 3. Quản lý biến thể sản phẩm & giá bán (Product Variant)

**Mô tả:** Mỗi sản phẩm có thể có nhiều biến thể (màu sắc, phiên bản...) với mã SKU và giá bán riêng — đây là đơn vị thực sự được mua/bán, không phải `Product`.

**Thao tác CRUD:**
- **Thêm:** nhập SKU, thuộc tính biến thể (JSON — ví dụ `{"color":"black"}`), giá bán, giá so sánh (giá gốc trước giảm), ảnh riêng nếu có.
- **Sửa:** cập nhật giá, thuộc tính, trạng thái (`active`/ngừng bán).
- **Xóa:** xóa biến thể (cascade khi sản phẩm cha bị xóa).

**Ràng buộc dữ liệu:**
- `sku`: bắt buộc, **duy nhất toàn hệ thống** (UNIQUE).
- `price`: bắt buộc (NOT NULL) — không được để trống giá bán.
- `product_id`: khóa ngoại bắt buộc tới `products`, xóa sản phẩm cha sẽ xóa luôn biến thể (ON DELETE CASCADE).
- Giá trong `order_items` được **snapshot (sao chép) tại thời điểm đặt hàng** (`unit_price`, `product_name_snapshot`) — nếu sau này đổi giá ở `product_variants`, các hóa đơn cũ **không bị thay đổi hồi tố**, đảm bảo tính toàn vẹn lịch sử giao dịch.

---

## 4. Quản lý giỏ hàng (Cart)

**Mô tả:** Người mua thêm sản phẩm vào giỏ, điều chỉnh số lượng, chọn/bỏ chọn sản phẩm muốn thanh toán, xóa khỏi giỏ.

**Thao tác CRUD:**
- **Thêm:** chọn biến thể sản phẩm + số lượng.
- **Sửa:** đổi số lượng, đổi trạng thái chọn (`is_selected`) để quyết định sản phẩm nào được tính vào hóa đơn khi checkout.
- **Xóa:** xóa 1 dòng giỏ hàng, hoặc xóa nhiều dòng cùng lúc.

**Ràng buộc dữ liệu:**
- `quantity`: mặc định 1, phải ≥ 1 (kiểm tra ở tầng service, không cho số lượng âm/0).
- `user_id`: khóa ngoại bắt buộc, xóa tài khoản người dùng sẽ xóa theo tầng toàn bộ giỏ hàng (ON DELETE CASCADE).
- Mỗi dòng giỏ hàng gắn với 1 `variant_id` cụ thể (không phải `product_id`) — vì giá/tồn kho được quản lý theo biến thể.

---

## 5. Tạo hóa đơn/đơn hàng từ giỏ hàng (Checkout)

**Mô tả:** Khi người mua thanh toán, hệ thống lấy các dòng giỏ hàng đang được chọn (`is_selected = true`), gộp thành **1 hóa đơn (Order) duy nhất**, dù giỏ hàng có nhiều sản phẩm khác nhau.

**Thao tác CRUD (Create):**
- Kiểm tra địa chỉ giao hàng thuộc đúng người dùng.
- Với từng dòng giỏ hàng đã chọn: tra giá hiện tại của biến thể, **snapshot giá và tên sản phẩm** vào `order_items` (không tham chiếu động tới bảng sản phẩm).
- Tính `subtotal_amount` (tổng tiền hàng), `total_amount` (tổng thanh toán).
- Tạo 1 bản ghi `order_status_histories` đầu tiên với trạng thái `pending`.
- Xóa các dòng giỏ hàng đã được chuyển thành đơn.

**Ràng buộc dữ liệu:**
- `address_id`: bắt buộc (NOT NULL) — đơn hàng luôn phải có địa chỉ giao hàng.
- `shipping_address_snapshot`: bắt buộc — **sao chép** địa chỉ đầy đủ tại thời điểm đặt hàng, tránh bị ảnh hưởng nếu người dùng sửa địa chỉ gốc sau này.
- `subtotal_amount`, `total_amount`: bắt buộc, không được NULL.
- `status`: mặc định `pending` khi vừa tạo.
- Nếu biến thể không còn tồn tại/không hợp lệ ở thời điểm checkout → giữ nguyên dòng đó trong giỏ hàng (không xóa), báo lỗi cho người dùng thay vì tạo đơn với dữ liệu sai.

---

## 6. Xác nhận / Huỷ đơn hàng

**Mô tả:** Người mua có thể **yêu cầu huỷ** đơn đang chờ xử lý; nhân viên bán hàng xác nhận đơn hợp lệ để chuyển sang khâu đóng gói.

**Thao tác (Update trạng thái):**
- Người mua: chỉ được chuyển trạng thái sang `cancel_requested` (yêu cầu huỷ), không được tự xác nhận đơn.
- Nhân viên: chuyển `pending → confirmed`, hoặc xử lý yêu cầu huỷ (`cancel_requested → cancelled`).
- Mỗi lần đổi trạng thái đều ghi thêm 1 dòng vào `order_status_histories` (ai đổi, đổi lúc nào, lý do).

**Ràng buộc dữ liệu:**
- Đây là **máy trạng thái (state machine)** — không cho phép nhảy trạng thái tùy ý (ví dụ: không thể chuyển thẳng từ `pending` sang `delivered`), được kiểm tra chặt ở tầng service (không chỉ dựa vào CSDL).
- `changed_by_type`: phân biệt rõ `buyer`/`employee`/`system` thực hiện thay đổi — phục vụ truy vết trách nhiệm.

---

## 7. Cập nhật thông tin đóng gói & vận chuyển

**Mô tả:** Nhân viên kho xác nhận kho xuất hàng, đơn vị vận chuyển cho đơn hàng đã được xác nhận (`confirmed`).

**Thao tác (Update):**
- Gán `warehouse_id` (kho xuất hàng) và `shipping_provider_name` (đơn vị vận chuyển) cho đơn hàng.
- Tự động chuyển `shipment_status` sang `packed` (đã đóng gói).

**Ràng buộc dữ liệu:**
- **Chỉ thực hiện được khi đơn đang ở trạng thái `confirmed`** — nếu đơn chưa được xác nhận hoặc đã huỷ, hệ thống từ chối thao tác này (báo lỗi "Chỉ đơn đã xác nhận mới được đóng gói").
- `warehouse_id`: khóa ngoại phải trỏ tới kho có thật trong hệ thống.

---

## 8. Cập nhật mã vận đơn & trạng thái giao hàng (Tracking)

**Mô tả:** Nhân viên kho cập nhật mã vận đơn và tiến trình giao hàng (`shipping` → `delivered`).

**Thao tác (Update):**
- Nhập `tracking_no` (mã vận đơn), cập nhật `shipment_status`.
- Khi `shipment_status = shipping`, đồng bộ `orders.status = shipping`; khi `shipment_status = delivered`, đồng bộ `orders.status = delivered`.

**Ràng buộc dữ liệu:**
- Bắt buộc đơn hàng **đã có đủ thông tin đóng gói/vận chuyển** (từ chức năng 7) trước khi cập nhật tracking — nếu chưa đủ, hệ thống từ chối ("Đơn hàng chưa có đủ thông tin đóng gói và vận chuyển").
- Mỗi lần cập nhật trạng thái giao hàng đều ghi lịch sử vào `order_status_histories`, đảm bảo truy vết đầy đủ chuỗi `pending → confirmed → shipping → delivered`.

---

## 9. Tra cứu lịch sử & chi tiết hóa đơn

**Mô tả:** Người mua xem danh sách đơn đã đặt (có thể lọc theo trạng thái); nhân viên xem đơn thuộc phạm vi xử lý của mình. Xem chi tiết 1 đơn gồm đầy đủ sản phẩm, trạng thái hiện tại, và toàn bộ lịch sử thay đổi trạng thái.

**Thao tác (Read):**
- Danh sách đơn: lọc theo `status`, sắp xếp theo thời gian tạo.
- Chi tiết đơn: trả về thông tin đơn, danh sách `order_items` (snapshot giá/tên sản phẩm tại thời điểm mua), và toàn bộ `order_status_histories` theo thứ tự thời gian.

**Ràng buộc dữ liệu:**
- Người mua **chỉ xem được đơn của chính mình** (kiểm tra `user_id` khớp với người đang đăng nhập) — không được xem đơn của người khác dù biết ID đơn.
- Nhân viên xem theo phạm vi vai trò (ví dụ: nhân viên kho chỉ thấy đơn liên quan kho mình phụ trách).

---

## 10. Quản lý khách hàng (Customer — CRM)

**Mô tả:** Nhân viên CS/admin xem danh sách khách hàng (người dùng có `role = buyer`), tìm kiếm/lọc theo trạng thái, khóa hoặc xóa mềm tài khoản vi phạm.

**Thao tác CRUD:**
- **Đọc (danh sách):** hiển thị họ tên, email/SĐT, tuổi (tính từ `dob`), tổng số đơn hàng, giá trị vòng đời khách hàng (LTV), trạng thái tài khoản.
- **Sửa (khóa/mở khóa):** đổi `status` giữa `active` ↔ `locked`.
- **Xóa mềm (soft delete):** đổi `status` sang `deleted` — **không xóa dữ liệu thật khỏi CSDL**, chỉ ẩn khỏi danh sách hoạt động, giữ nguyên lịch sử đơn hàng liên quan để phục vụ báo cáo/đối soát sau này.
- Hỗ trợ thao tác hàng loạt (khóa/xóa mềm nhiều khách hàng cùng lúc).

**Ràng buộc dữ liệu:**
- `email`, `phone`: mỗi trường **duy nhất toàn hệ thống** (UNIQUE) nếu có giá trị — không cho 2 tài khoản trùng email/SĐT.
- `status`: chỉ nhận 1 trong 3 giá trị `active`/`locked`/`deleted`, mặc định `active`.
- Khách hàng **tự đăng ký qua ứng dụng**, nhân viên **không được tạo tài khoản khách hàng trực tiếp** — chỉ được thao tác trên tài khoản đã tồn tại (khóa/mở khóa/xóa mềm).
- Chỉ nhân viên thuộc bộ phận **CS hoặc Admin** mới có quyền truy cập chức năng này (kiểm tra ở tầng phân quyền backend, độc lập với giao diện).
