# Phần bổ sung P4 cho văn bản đề tài

> **Cách dùng:** Chèn toàn bộ nội dung dưới đây vào cuối mục **III. Mô tả chi tiết các chức năng chính**, ngay sau chức năng 10. Nội dung này bổ sung phạm vi P4 mà văn bản gốc chưa mô tả chi tiết. Không thay đổi mã nguồn.

## 11. Thanh toán đơn hàng và Ví điện tử nội bộ (Payment & Wallet)

**Mô tả:** Hệ thống ghi nhận thanh toán cho đơn hàng và cho phép người mua nạp, xem, sử dụng số dư ví nội bộ. Đây là tính năng **mô phỏng**, không kết nối cổng thanh toán hoặc ngân hàng thật.

**Thao tác:**

* Người mua xem số dư ví và lịch sử giao dịch của chính mình.
* Người mua tạo yêu cầu nạp ví bằng chuyển khoản mô phỏng; hệ thống đánh dấu giao dịch nạp thành công ngay trong môi trường thử nghiệm, ghi nhận thanh toán và cộng số dư ví.
* Khi thanh toán đơn bằng ví, hệ thống kiểm tra số dư trước khi trừ tiền; chỉ thanh toán thành công khi số dư đủ.
* Hệ thống lưu giao dịch thanh toán của đơn theo phương thức được chọn (ví dụ: COD, chuyển khoản mô phỏng hoặc ví nội bộ).

**Ràng buộc dữ liệu và nghiệp vụ:**

* Mỗi giao dịch thanh toán phải có mục đích rõ ràng: `checkout` (thanh toán đơn) hoặc `wallet_topup` (nạp ví), số tiền lớn hơn 0, thời gian tạo và trạng thái giao dịch.
* Số dư ví không được âm. Việc tạo thanh toán, ghi lịch sử ví và cập nhật số dư phải thành công hoặc thất bại cùng lúc để tránh cộng/trừ tiền thiếu.
* Mỗi yêu cầu nạp ví phải có mã yêu cầu duy nhất. Gửi lại đúng cùng mã yêu cầu chỉ được trả về giao dịch đã có, không được cộng tiền lần hai.
* Người mua chỉ được xem và thao tác trên ví, giao dịch thanh toán của chính mình; nhân viên không được dùng giao diện người mua để thay đổi số dư.
* Cần thống nhất trong nhóm quy tắc trạng thái cho từng phương thức thanh toán (đặc biệt COD và chuyển khoản mô phỏng): khi nào là `pending`, `paid`, `failed`, `refunded`.

## 12. Quản lý chương trình khuyến mãi, voucher và Flash Sale (Marketing)

**Mô tả:** Nhân viên bán hàng hoặc Admin tạo và quản lý ưu đãi theo thời gian, gồm chương trình khuyến mãi, mã voucher, giảm giá theo SKU/Flash Sale và giảm giá trên hóa đơn.

**Thao tác CRUD:**

* Tạo, xem, sửa, xóa chương trình khuyến mãi: tên, thời gian bắt đầu/kết thúc, trạng thái và điều kiện áp dụng.
* Tạo, xem, sửa, xóa voucher: mã voucher, loại giảm (phần trăm hoặc số tiền cố định), giá trị giảm, hạn dùng, điều kiện đơn tối thiểu và cấp thành viên được phép dùng nếu có.
* Tạo, xem, sửa, xóa giảm giá sản phẩm: chọn SKU, phần trăm giảm hoặc giá Flash Sale, số lượng giới hạn và số lượng đã bán.
* Tạo, xem, sửa, xóa giảm giá hóa đơn: số tiền hoặc phần trăm giảm theo chương trình.
* Người mua xem các voucher còn hiệu lực và xem trước số tiền được giảm trước checkout.

**Ràng buộc dữ liệu và nghiệp vụ:**

* Mã voucher được chuẩn hóa viết hoa và là duy nhất toàn hệ thống. Giá trị giảm phải lớn hơn 0; ngày kết thúc phải sau ngày bắt đầu.
* Voucher chỉ hợp lệ khi chương trình đang hoạt động, chưa hết hạn, thỏa điều kiện đơn hàng và thỏa điều kiện cấp thành viên (nếu được cấu hình).
* Số tiền giảm không được lớn hơn tổng tiền hàng. Tổng thanh toán cuối cùng phải được tính lại ở phía máy chủ theo giá và dữ liệu khuyến mãi hiện hành; không tin trực tiếp số tiền do trình duyệt gửi lên.
* SKU áp dụng Flash Sale phải tồn tại. Số lượng đã bán không được vượt số lượng giới hạn; ưu đãi đã phát sinh bán hàng không được sửa/xóa theo cách làm sai lệch lịch sử.
* Chỉ Sales/Admin có quyền quản lý dữ liệu marketing. Người mua chỉ được xem và áp dụng ưu đãi đủ điều kiện cho mình.
* Nhóm cần chốt rõ chính sách cộng dồn: một đơn được dùng tối đa bao nhiêu voucher, voucher có được cộng với Flash Sale/giảm hóa đơn hay không, và thứ tự tính giảm giá. Quy tắc này phải nhất quán ở giao diện và khi checkout.

## 13. Tích điểm và cấp bậc thành viên (Loyalty)

**Mô tả:** Hệ thống lưu điểm tích lũy, cấp bậc thành viên và lịch sử biến động điểm của người mua để phục vụ ưu đãi theo khách hàng.

**Thao tác:**

* Người mua xem tổng điểm hiện có, cấp bậc hiện tại và lịch sử cộng/trừ điểm của chính mình.
* Hệ thống cộng điểm khi đơn hàng đã giao thành công (`delivered`); mọi lần cộng/trừ đều có bản ghi lịch sử nêu rõ nguồn phát sinh.
* Hệ thống cập nhật cấp bậc khi điểm thay đổi theo chính sách đã thiết lập.

**Ràng buộc dữ liệu và nghiệp vụ:**

* Điểm chỉ được ghi nhận một lần cho cùng một đơn hàng đủ điều kiện; không được cộng lặp do người dùng tải lại trang hoặc nhân viên cập nhật lại trạng thái.
* Điểm và cấp bậc của người mua không được sửa trực tiếp từ giao diện thông thường; mọi thay đổi phải có lịch sử để truy vết.
* Cần chốt chính sách điểm trước khi nghiệm thu: tỷ lệ quy đổi tiền sang điểm, các mốc cấp bậc, điểm có hết hạn hay không và điều kiện trừ điểm khi hoàn tiền.

## 14. Yêu cầu đổi trả và hoàn tiền (Refund/Return)

**Mô tả:** Người mua tạo yêu cầu đổi trả/hoàn tiền cho từng dòng sản phẩm đã mua; bộ phận CS hoặc Admin tiếp nhận, phê duyệt hoặc từ chối. Khi hoàn tiền được duyệt, tiền hoàn được cộng vào ví nội bộ của người mua trong phạm vi mô phỏng của đồ án.

**Thao tác:**

* Người mua tạo yêu cầu theo `order_item`, nhập lý do và thông tin hỗ trợ cần thiết; xem trạng thái yêu cầu của chính mình.
* CS/Admin xem danh sách yêu cầu, xem thông tin đơn và quyết định phê duyệt hoặc từ chối, kèm lý do xử lý.
* Khi phê duyệt, hệ thống tạo giao dịch hoàn tiền, ghi lịch sử ví và cập nhật số dư người mua.

**Ràng buộc dữ liệu và nghiệp vụ:**

* Người mua chỉ được yêu cầu cho dòng hàng thuộc đơn của chính mình và chỉ khi đơn/dòng hàng thỏa điều kiện đổi trả đã quy định.
* Một dòng hàng không được có hai yêu cầu hoàn tiền đang xử lý hoặc đã hoàn tất cho cùng một lượng hàng.
* Máy trạng thái tối thiểu: `requested` → `approved` hoặc `rejected`; yêu cầu đã duyệt phải hoàn tiền thành công trước khi được xem là `refunded`. Mỗi thay đổi trạng thái phải lưu người xử lý, thời gian và lý do.
* Số tiền hoàn phải dựa trên giá đã snapshot tại `order_item` và chính sách giảm giá của đơn; không lấy giá sản phẩm hiện tại.
* Việc phê duyệt, tạo giao dịch hoàn tiền, ghi lịch sử ví và cộng số dư phải được thực hiện nhất quán để không hoàn tiền hai lần.
* Cần chốt thời hạn được yêu cầu đổi trả, các trạng thái đơn được phép yêu cầu, và cách xử lý phí vận chuyển/giảm giá khi hoàn một phần đơn.

## 15. Đánh giá sản phẩm và phản hồi (Review)

**Mô tả:** Người mua đánh giá sản phẩm đã mua sau khi đơn được giao thành công; nhân viên có thể phản hồi đánh giá để hỗ trợ khách hàng và cải thiện chất lượng bán hàng.

**Thao tác:**

* Người mua tạo, xem và cập nhật đánh giá của mình cho từng dòng sản phẩm đủ điều kiện; nội dung gồm số sao và nhận xét.
* Người dùng xem các đánh giá công khai của sản phẩm.
* Sales/Admin phản hồi đánh giá khi cần; phản hồi hiển thị kèm thông tin nhân viên và thời gian phản hồi.

**Ràng buộc dữ liệu và nghiệp vụ:**

* Chỉ người mua thực sự sở hữu `order_item` và đơn đã ở trạng thái `delivered` mới được gửi đánh giá.
* Mỗi người mua chỉ được có một đánh giá cho một `order_item`; số sao là số nguyên từ 1 đến 5, nhận xét có thể để trống nhưng bị giới hạn độ dài hợp lý.
* Người mua không được sửa/xóa đánh giá của người khác; nhân viên chỉ được phản hồi, không được giả danh người mua để tạo đánh giá.
* Đánh giá và phản hồi phải lưu thời điểm tạo/cập nhật để phục vụ kiểm duyệt và truy vết.

## 16. Phân quyền P4

| Vai trò | Quyền trong P4 |
|---|---|
| Người mua (Buyer) | Xem ví, nạp ví mô phỏng, thanh toán đơn của mình, xem voucher đủ điều kiện, xem điểm/cấp bậc, tạo và theo dõi yêu cầu hoàn tiền của mình, đánh giá hàng đã mua. |
| Nhân viên bán hàng (Sales) | Quản lý chương trình khuyến mãi, voucher, Flash Sale/giảm giá sản phẩm và giảm giá hóa đơn; phản hồi đánh giá khi được phân quyền. |
| Chăm sóc khách hàng (CS) | Xem, phê duyệt hoặc từ chối yêu cầu đổi trả/hoàn tiền; phản hồi đánh giá khi được phân quyền. |
| Admin | Có toàn bộ quyền của Sales và CS, đồng thời quản trị cấu hình/chính sách liên quan. |

**Nguyên tắc chung:** Phân quyền phải được kiểm tra ở backend. Việc ẩn nút trên giao diện chỉ hỗ trợ trải nghiệm người dùng, không được dùng thay cho kiểm soát quyền truy cập.
