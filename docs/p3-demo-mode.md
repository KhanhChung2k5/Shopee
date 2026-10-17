# P3 Demo Mode (temporary integration scaffold)

Mục đích: cho phép kiểm thử đầy đủ UI P3 (cart → checkout → order history → detail/tracking/cancel) trong lúc API của P1/P2/P4/P5 chưa merge. Toàn bộ dữ liệu chỉ nằm trong `localStorage`; chế độ này không gọi backend và không chạm database dùng chung.

## Cách chạy

1. Chạy frontend như bình thường: `npm run dev` trong thư mục `web`.
2. Mở `http://127.0.0.1:5173/?p3-demo=1`.
3. Nhấn **Dùng buyer demo** trên thanh vàng.
4. Thêm sản phẩm → giỏ hàng → thanh toán → xem đơn.
5. Trong chi tiết đơn, dùng nút **Mô phỏng bước tiếp theo** để đi qua `pending → confirmed → shipping → delivered` và kiểm tra tracking.

`?p3-demo=1` chỉ bật cờ; cờ được giữ trong `localStorage` khi đổi route. Nút **Tắt demo** xoá cả cờ và phiên đăng nhập giả.

## Phạm vi fake và chủ sở hữu API thật

| Phần | Dữ liệu/hành vi tạm | Khi merge thật |
|---|---|---|
| P1 | Login buyer, hồ sơ, địa chỉ | Giữ UI; dùng API P1 qua `apiFetch` như hiện tại |
| P2 | Ánh xạ catalog `sp-*` sang UUID variant; mô phỏng staff xác nhận đơn | Thay catalog bằng variant UUID thật; bỏ nút advance demo |
| P4 | Thanh toán COD thành công mặc định | Nối payment flow thật, không sửa snapshot/order history P3 |
| P5 | Warehouse, nhà vận chuyển, tracking, trạng thái giao | Bỏ advance demo; P3 đọc dữ liệu tracking từ API thật |

## Điểm nối được cố ý giới hạn

- `web/src/demo/p3DemoApi.ts`: toàn bộ fake state và fake endpoint.
- `web/src/demo/P3DemoBanner.tsx`: cảnh báo, login/reset/tắt demo.
- `web/src/lib/api.ts`: một nhánh chuyển request sang adapter khi demo bật.
- `web/src/state/CartContext.tsx`: chỉ ánh xạ ID catalog mẫu sang UUID demo.
- `web/src/pages/OrderDetailPage.tsx`: chỉ hiển thị nút advance khi demo bật.
- `web/src/App.tsx`: mount banner.

Không thêm fake logic vào backend, entity/repository/service P3 hoặc code của P1/P2/P4/P5. Nhờ đó mỗi nhóm vẫn có thể merge độc lập.

## Checklist gỡ khi API thật đã đủ

1. Kiểm tra catalog P2 trả về `variantId` UUID thật và Cart API nhận được ID đó.
2. Kiểm tra P1 trả đúng shape login/profile/address đang dùng trong UI.
3. Kiểm tra P5 cập nhật `warehouseId`, `shippingProviderName`, `trackingNo`, `shipmentStatus`.
4. Xoá thư mục `web/src/demo`.
5. Bỏ nhánh demo trong `web/src/lib/api.ts`, mapping demo trong `CartContext.tsx`, banner trong `App.tsx`, và control demo trong `OrderDetailPage.tsx`.
6. Chạy `npm run build`, test backend P3, rồi test lại flow trên API/database test riêng.

Từ khoá comment để agent khác tìm nhanh: `P3-DEMO-INTEGRATION-SEAM`.
