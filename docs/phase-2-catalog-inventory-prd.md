# PRD — Phase 2: Catalog & Inventory (Sản phẩm & Kho hàng)

| Thuộc tính | Giá trị |
|---|---|
| Sản phẩm | Chợ Tốt Mua |
| Phase | 2 — Catalog & Inventory |
| Trạng thái | Draft để nhóm review |
| Nền tảng | Web khách hàng (React), Web Admin (React), Mobile (Flutter), Backend (Spring Boot), PostgreSQL |
| Tài liệu liên quan | [`project-overview.md`](./project-overview.md), [`crm-ecommerce-class-diagram.md`](../crm-ecommerce-class-diagram.md) |

## 1. Tóm tắt

Phase 2 cung cấp một nguồn dữ liệu sản phẩm thống nhất cho cửa hàng bán lẻ tay cầm chơi game, đĩa game và phụ kiện. Khách hàng duyệt, tìm kiếm và lọc sản phẩm trên web/mobile; nhân viên kinh doanh quản lý danh mục, sản phẩm, biến thể và giá; nhân viên kho quản lý nhiều kho, lập phiếu nhập và theo dõi số lượng tồn.

Đây là hệ thống của **một doanh nghiệp bán lẻ**, không phải marketplace. Mỗi sản phẩm có thể có một hoặc nhiều biến thể có SKU riêng. Tồn kho được theo dõi theo biến thể và kho, có lịch sử biến động để đối soát với đơn hàng.

## 2. Bối cảnh và căn cứ thiết kế

- `project-overview.md` xác định các actor chính gồm khách hàng, nhân viên kinh doanh, nhân viên kho và admin; giao diện khách hàng và admin hiện mới dùng dữ liệu mẫu.
- Class diagram domain B đã có `Category` phân cấp (`parentId`), `Brand`, `Product`, `ProductVariant`, `ProductImage`, `Warehouse`, `InventoryStock`, `InventoryMovement`.
- `Product` đã chốt các thuộc tính riêng theo ngành: `productType`, `platforms`, `publisher`, `genre`, `ageRating`, `releaseDate`, `connectionType`, `warrantyMonths`. `ProductVariant` giữ `sku`, `attributes`, `price`, `comparePrice`, ảnh và trạng thái.
- Class diagram hiện **chưa có Supplier/PurchaseReceipt/PurchaseReceiptItem**. Phiếu nhập là yêu cầu của phase này và cần được bổ sung vào mô hình dữ liệu trước khi triển khai API.

## 3. Mục tiêu

1. Nhân viên có thể duy trì catalog chính xác, có phân cấp và biến thể nhận diện bằng SKU.
2. Khách hàng có thể khám phá sản phẩm theo danh mục, loại hàng, nền tảng, thương hiệu và thuộc tính phù hợp.
3. Nhân viên kho có thể quản lý tồn của từng SKU tại từng kho và ghi nhận nhập hàng có thể kiểm tra lại.
4. Đơn hàng ở Phase 3 có thể đọc tồn khả dụng và ghi nhận giữ/trừ/hoàn tồn mà không làm sai lịch sử.
5. Web, mobile và admin sử dụng chung API và quy tắc nghiệp vụ.

## 4. Ngoài phạm vi

- Giỏ hàng, đặt hàng, thanh toán, vận chuyển và đổi trả (Phase 3); Phase 2 chỉ cung cấp dữ liệu/tồn kho cho các luồng đó.
- Nhà bán bên thứ ba, marketplace hoặc kho thuộc từng shop.
- Chuyển kho giữa các chi nhánh, kiểm kê điều chỉnh, trả hàng nhà cung cấp, quản lý lô/serial/IMEI, giá vốn kế toán và dự báo nhu cầu.
- Tạo chương trình voucher/flash sale (Phase 4); giá niêm yết và giá so sánh của biến thể vẫn được quản lý ở Phase 2.
- Tự động đồng bộ tồn từ nhà cung cấp hoặc đơn vị vận chuyển.

## 5. Người dùng và quyền hạn

| Actor | Nhu cầu / quyền trong phase |
|---|---|
| Khách hàng | Xem sản phẩm đã công khai; tìm kiếm, lọc, sắp xếp; xem biến thể, giá, tình trạng còn hàng và thuộc tính. Không xem số lượng tồn nội bộ chính xác. |
| Nhân viên kinh doanh (`Employee.department = sales`) | Tạo/sửa danh mục, thương hiệu, sản phẩm, ảnh, biến thể và giá; lưu nháp, công khai/ngừng bán. Không ghi nhận phiếu nhập hoặc sửa tồn trực tiếp. |
| Nhân viên kho (`department = warehouse`) | Xem SKU và tồn theo kho; tạo, xác nhận phiếu nhập; xem lịch sử biến động. Không thay đổi mô tả catalog/giá. |
| Admin (`department = admin`) | Toàn quyền; cấu hình kho, quản lý quyền và tra cứu audit. |

Mọi API quản trị phải kiểm tra quyền ở backend; ẩn nút ở giao diện không được xem là kiểm soát quyền.

## 6. Phạm vi chức năng và yêu cầu

### 6.1 Danh mục và thương hiệu

- Tạo, sửa, ẩn/hiện danh mục và thương hiệu.
- Danh mục hỗ trợ cây nhiều cấp thông qua `parentId`; không cho một danh mục làm cha của chính nó hoặc tạo vòng lặp.
- Có tên và `slug` duy nhất; danh mục đang được sản phẩm sử dụng không bị xóa cứng. Có thể ngừng hiển thị/đánh dấu không hoạt động.
- Trang khách hàng hiển thị cây danh mục chỉ gồm các nhánh đang hoạt động và có sản phẩm công khai.
- Khi chuyển danh mục của sản phẩm, hệ thống lưu quan hệ mới và không làm thay đổi lịch sử đơn hàng.

### 6.2 Sản phẩm và biến thể

- Tạo/sửa sản phẩm với tên, mô tả, danh mục, thương hiệu, loại sản phẩm, ảnh, trạng thái và thuộc tính ngành hàng.
- Loại sản phẩm: `game_disc`, `controller`, `accessory`.
- Quy tắc thuộc tính theo loại:
  - Đĩa game: nền tảng, nhà phát hành, thể loại, xếp hạng độ tuổi, ngày phát hành.
  - Tay cầm: nền tảng tương thích, kiểu kết nối, ngày phát hành, thời hạn bảo hành.
  - Phụ kiện: nền tảng/kiểu kết nối khi áp dụng, ngày phát hành và thời hạn bảo hành khi áp dụng.
- Thuộc tính riêng của SKU (ví dụ màu sắc, phiên bản, khu vực phát hành) lưu ở `ProductVariant.attributes`; mỗi biến thể có SKU duy nhất, giá, giá so sánh tùy chọn, ảnh và trạng thái riêng.
- Sản phẩm công khai cần có tối thiểu một biến thể đang bán, danh mục hợp lệ và dữ liệu bắt buộc theo loại sản phẩm. Không công khai sản phẩm thiếu SKU/giá hợp lệ.
- SKU đã phát sinh giao dịch không được xóa hoặc tái sử dụng; có thể ngừng kinh doanh.
- Không cho giá âm; `comparePrice`, nếu có, phải lớn hơn hoặc bằng giá bán.
- Ảnh sản phẩm có thứ tự hiển thị; biến thể có thể dùng ảnh riêng.
- Lưu người tạo/cập nhật và thời điểm thay đổi cho thao tác quản trị.

### 6.3 Duyệt và tìm sản phẩm phía khách hàng

- Khách có thể duyệt cây danh mục, trang danh sách và trang chi tiết sản phẩm trên web/mobile.
- Tìm theo tên sản phẩm, tên thương hiệu và SKU (SKU có thể giới hạn cho giao diện nội bộ nếu UX khách hàng không cần).
- Bộ lọc tối thiểu: danh mục, thương hiệu, loại sản phẩm, nền tảng tương thích, khoảng giá, còn hàng; bộ lọc đặc thù tùy loại gồm thể loại/xếp hạng độ tuổi cho đĩa game và kiểu kết nối cho phần cứng.
- Sắp xếp theo liên quan/mặc định, giá tăng/giảm, mới nhất.
- Chỉ trả sản phẩm/biến thể công khai, đang hoạt động. Hết hàng vẫn có thể hiện nếu UX chọn cho phép, nhưng phải ghi rõ trạng thái và không thể đặt mua khi tích hợp Phase 3.
- Tồn hiển thị công khai ở dạng trạng thái (`Còn hàng`, `Sắp hết` nếu được cấu hình, `Hết hàng`), không trả số lượng chính xác.

### 6.4 Kho và tồn kho

- Admin quản lý danh sách kho/chi nhánh: tên, địa chỉ, trạng thái hoạt động.
- Tồn được xác định theo cặp biến thể–kho (`InventoryStock`). Tạo một bản ghi duy nhất cho mỗi cặp.
- Hiển thị tồn vật lý, số lượng đang giữ và khả dụng. Công thức: `availableQty = quantity - reservedQty`; không để giá trị khả dụng âm.
- Không cho nhân viên sửa trực tiếp số lượng bằng CRUD tùy ý; thay đổi tồn phải xuất phát từ phiếu nhập hoặc nghiệp vụ có loại biến động và người thực hiện được ghi nhận.
- Ghi `InventoryMovement` cho mọi biến động tồn: tối thiểu loại, số lượng, kho/SKU (qua stock), thời điểm; liên kết đơn hàng khi biến động do đơn hàng. Nhập hàng liên kết phiếu nhập theo phần mở rộng schema bên dưới.
- Danh sách tồn hỗ trợ lọc kho, SKU/tên sản phẩm, danh mục và trạng thái còn hàng; có trang chi tiết lịch sử biến động.
- Khi tích hợp đơn hàng, thao tác giữ/trả/trừ tồn phải nguyên tử theo SKU–kho để tránh bán vượt tồn. Tồn khả dụng dùng để bán là tổng khả dụng của các kho được phép phục vụ kênh bán.

### 6.5 Nhập hàng bằng phiếu nhập

- Nhân viên kho tạo phiếu nhập tại một kho, thêm nhiều dòng SKU và số lượng; thông tin nhà cung cấp/ghi chú/chứng từ tham chiếu là tùy chọn theo cấu hình triển khai.
- Phiếu nhập có mã duy nhất, người tạo, thời điểm tạo, kho nhận, trạng thái và danh sách dòng gồm biến thể, SKU snapshot, số lượng dự kiến, số lượng thực nhận.
- Trạng thái tối thiểu: `draft` → `received` hoặc `cancelled`. Chỉ phiếu `received` mới cộng tồn và tạo movement loại `inbound`.
- Xác nhận nhận hàng là thao tác một lần, nguyên tử: cập nhật stock và movement cùng giao dịch DB. Gửi lặp request không được cộng tồn hai lần (idempotency).
- Phiếu đã nhận không sửa/xóa trực tiếp. Sai lệch được xử lý bằng nghiệp vụ điều chỉnh riêng trong phase sau hoặc quy trình được admin kiểm soát, có movement đối ứng và lý do.
- Phiếu nháp có thể sửa/hủy; phiếu hủy không ảnh hưởng tồn.
- Ghi nhận người tạo, người xác nhận và thời điểm xác nhận.

## 7. Bổ sung mô hình dữ liệu cần chốt

Schema hiện tại đã có các entity catalog/kho nêu ở mục 2 nhưng chưa mô hình hóa phiếu nhập. Đề xuất bổ sung tối thiểu:

| Entity | Trường chính đề xuất | Quan hệ / quy tắc |
|---|---|---|
| `PurchaseReceipt` | `id`, `code`, `warehouseId`, `status`, `note`, `createdByEmployeeId`, `receivedByEmployeeId`, `createdAt`, `receivedAt` | Nhiều phiếu thuộc một kho; `code` duy nhất; trạng thái `draft/received/cancelled`. |
| `PurchaseReceiptItem` | `id`, `receiptId`, `variantId`, `quantityExpected`, `quantityReceived`, `skuSnapshot`, `productNameSnapshot` | Nhiều dòng thuộc một phiếu; số lượng nguyên dương; snapshot giữ lịch sử khi SKU/tên đổi. |

Điều chỉnh `InventoryMovement` để có thể liên kết nguồn nhập: thêm `purchaseReceiptItemId` (nullable) hoặc cặp `referenceType/referenceId` có kiểm soát; cần ràng buộc không đồng thời liên kết nguồn không hợp lệ. Với migration đầu tiên, FK nullable tới `PurchaseReceiptItem` rõ ràng và dễ kiểm tra hơn. Cần bổ sung `createdByEmployeeId`/actor tương đương cho movement nếu schema/migration hiện tại chưa lưu người thực hiện.

Không đưa Supplier vào phạm vi bắt buộc vì yêu cầu hiện tại chỉ cần phiếu nhập và class diagram chưa có nhà cung cấp. Nếu nhóm cần tra cứu nhà cung cấp, bổ sung `Supplier` và liên kết tùy chọn vào `PurchaseReceipt` như quyết định schema riêng.

## 8. Quy tắc nghiệp vụ và dữ liệu

- SKU là duy nhất toàn hệ thống, không phân biệt chữ hoa/thường sau chuẩn hóa.
- Một sản phẩm có ít nhất một biến thể trước khi công khai; một biến thể có thể chưa có tồn.
- `quantity`, `reservedQty`, số lượng nhập là số nguyên không âm; `reservedQty <= quantity`.
- Tổng tồn theo sản phẩm là tổng các biến thể/kho, nhưng không được thay thế truy vấn theo biến thể khi kiểm tra khả năng bán.
- Chỉ trạng thái sản phẩm/biến thể cho phép bán mới xuất hiện trong catalog công khai.
- Ngừng hoạt động kho không xóa lịch sử stock/movement. Quy tắc phân bổ đơn vào kho sẽ được chốt trong Phase 3.
- Dữ liệu biến động là append-only ở mức nghiệp vụ; sửa sai bằng movement đối ứng, không sửa số lượng movement cũ.
- Mọi thời gian lưu theo chuẩn backend nhất quán (UTC); hiển thị theo múi giờ giao diện.

## 9. Luồng chính

### 9.1 Công khai sản phẩm

1. Nhân viên kinh doanh tạo danh mục/thương hiệu (nếu chưa có).
2. Tạo sản phẩm, chọn `productType`, nhập thuộc tính tương ứng và ảnh.
3. Tạo một hoặc nhiều biến thể với SKU, attributes, giá.
4. Hệ thống kiểm tra dữ liệu bắt buộc và SKU trùng.
5. Nhân viên công khai; catalog khách hàng bắt đầu trả sản phẩm.

### 9.2 Nhập kho

1. Nhân viên kho chọn kho, tạo phiếu nháp và thêm dòng SKU/số lượng.
2. Đối chiếu hàng thực nhận, cập nhật số lượng nhận thực tế.
3. Xác nhận phiếu.
4. Backend trong một transaction chuyển phiếu sang `received`, tăng tồn tại đúng kho và ghi movement `inbound` cho từng dòng.
5. Khách hàng thấy trạng thái còn hàng sau khi catalog/tồn được cập nhật.

### 9.3 Khách tìm sản phẩm

1. Khách mở danh mục hoặc tìm kiếm.
2. Web/mobile gọi catalog API với từ khóa, bộ lọc, sắp xếp và phân trang.
3. API trả sản phẩm công khai cùng biến thể, giá và nhãn tồn kho không lộ số lượng chính xác.

## 10. Yêu cầu phi chức năng

- API REST dùng chung cho React, Flutter và admin; phân trang cho danh sách sản phẩm, tồn kho, phiếu nhập và movement.
- Tìm kiếm/lọc phải kết hợp được; filter nền tảng cần phù hợp kiểu dữ liệu JSON đã chọn trong schema hoặc được chuẩn hóa ở tầng API.
- Các lệnh xác nhận phiếu nhập và thay đổi tồn phải transactional, chống gửi lặp và xử lý cạnh tranh cập nhật.
- API quản trị yêu cầu xác thực, phân quyền theo `Employee.department`, và kiểm tra quyền trên từng thao tác.
- Lỗi validation trả thông báo có trường lỗi để UI chỉ rõ cách sửa; không trả stack trace/chi tiết DB.
- Các endpoint công khai chỉ trả dữ liệu catalog cần thiết, không bao gồm ghi chú nội bộ, actor, số lượng kho chính xác.
- Dùng migration Flyway và tương thích PostgreSQL theo kiến trúc đã ghi trong tổng quan.

## 11. Tiêu chí nghiệm thu

1. Có thể tạo cây danh mục nhiều cấp; API từ chối quan hệ tạo vòng lặp và slug trùng.
2. Nhân viên tạo sản phẩm game disc/controller/accessory với dữ liệu đặc thù đúng loại; không thể công khai nếu thiếu dữ liệu bắt buộc hoặc chưa có biến thể hợp lệ.
3. SKU trùng bị từ chối; biến thể có thể có giá/attributes độc lập; SKU đã được dùng không thể tái sử dụng sau khi ngừng bán.
4. Khách tìm và lọc được catalog theo danh mục, thương hiệu, nền tảng, giá, loại sản phẩm và trạng thái tồn; chỉ thấy sản phẩm công khai.
5. Nhân viên kinh doanh không thể thao tác endpoint kho; nhân viên kho không thể sửa giá/catalog nếu không có quyền bổ sung.
6. Phiếu nhập nháp không làm thay đổi tồn; hủy phiếu nháp không tạo movement.
7. Xác nhận phiếu nhập cập nhật đúng kho/SKU và tạo movement; gọi lại cùng yêu cầu không cộng tồn lần hai.
8. Tồn khả dụng tính đúng từ tồn vật lý trừ lượng đang giữ; không cho trạng thái vượt giới hạn.
9. Lịch sử movement hiển thị nguồn, loại, số lượng, thời điểm và người thao tác; không thể xóa/sửa movement qua luồng nghiệp vụ thường.
10. Giao diện web khách, mobile và admin đọc cùng dữ liệu từ API, thay cho dữ liệu mẫu khi domain được nối backend.

## 12. Chỉ số theo dõi sau phát hành

- Tỷ lệ sản phẩm công khai có đủ ảnh, danh mục, SKU và thuộc tính bắt buộc.
- Tỷ lệ truy vấn catalog có kết quả và tỷ lệ tìm kiếm không có kết quả.
- Số lần sai lệch tồn phát hiện qua đối soát giữa stock và movement.
- Tỷ lệ phiếu nhập được xác nhận thành công lần đầu; số lỗi xác nhận do SKU/kho không hợp lệ.
- Tỷ lệ trang danh sách/chi tiết catalog đáp ứng mục tiêu hiệu năng do nhóm thống nhất trước phát hành.

## 13. Phụ thuộc và câu hỏi cần nhóm chốt

- Xác nhận đề xuất thêm `PurchaseReceipt` và `PurchaseReceiptItem` vào class diagram + migration.
- Có cần quản lý nhà cung cấp trong Phase 2 không? PRD hiện để ngoài bắt buộc.
- Quy tắc hiển thị “sắp hết hàng” và ngưỡng cảnh báo là cấu hình toàn hệ thống hay theo SKU/kho?
- Phân bổ đơn hàng vào kho nào (gần địa chỉ, ưu tiên kho, hay một kho mặc định) thuộc Phase 3.
- Bộ trường bắt buộc theo `productType` cần được nhóm sản phẩm xác nhận trước khi validation API hoàn tất.
- Có cần hỗ trợ tìm SKU công khai cho khách hàng hay chỉ ở trang quản trị?

## 14. Phân rã triển khai đề xuất

1. **Schema**: rà soát migration hiện có; bổ sung phiếu nhập, dòng phiếu nhập, liên kết movement và ràng buộc/index.
2. **Backend catalog**: entity/repository/service/API cho category, brand, product, variant, image; validation và phân quyền.
3. **Backend inventory**: warehouse, stock query, movement history, transaction xác nhận phiếu nhập.
4. **Web Admin**: danh mục/sản phẩm/biến thể, kho/tồn, danh sách và chi tiết phiếu nhập.
5. **Web khách + Flutter**: danh mục, tìm kiếm/lọc, chi tiết sản phẩm và nhãn còn hàng qua API.
6. **Tích hợp Phase 3**: cung cấp API/contract để giữ, giải phóng và trừ tồn khi xử lý đơn.

