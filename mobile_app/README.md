# Chợ Tốt Mua – Mobile (Flutter)

Trang chủ ứng dụng di động cho sàn TMĐT, dùng chung design token (màu, font) với bản web (`../index.html`) — build từ dữ liệu design system của skill `ui-ux-pro-max`.

## Chạy thử

Máy build hiện chưa cài Flutter SDK nên code chưa được compile/test tại đây. Trên máy đã cài Flutter:

```bash
cd mobile_app
flutter pub get
flutter run
```

## Cấu trúc

- `lib/theme/app_theme.dart` — màu sắc, spacing, typography (Rubik/Nunito Sans), đồng bộ với `styles.css` của bản web.
- `lib/models/product.dart` — model Product/Voucher/Banner/Category.
- `lib/data/sample_data.dart` — dữ liệu mẫu được giữ làm dự phòng khi API không truy cập được.
- `lib/services/catalog_service.dart` — đọc danh mục, sản phẩm và chi tiết biến thể từ Catalog API.
- `lib/widgets/` — các thành phần: hero carousel, flash sale countdown, product card, voucher card, category grid.
- `lib/screens/home_screen.dart` — trang chủ lấy danh mục và gợi ý sản phẩm từ Catalog API; Flash Sale và voucher vẫn là dữ liệu mẫu vì backend chưa có API tương ứng.

## Ghi chú

- Danh mục, gợi ý và trang sản phẩm theo danh mục lấy từ API; khi request lỗi giao diện giữ dữ liệu mẫu và báo đang dùng dự phòng.
- Trang chi tiết đọc biến thể, giá, ảnh và tồn kho khả dụng từ API. Giỏ hàng giữ đúng SKU/biến thể và không cho vượt tồn kho đã đọc.
- Flash Sale, voucher, rating và thông báo vẫn là dữ liệu mẫu; backend hiện chưa có API tương ứng.
- Có thể chỉ định API cho thiết bị thật bằng `--dart-define=API_BASE_URL=http://<địa-chỉ-máy-chạy-backend>:8080`.
- Đã áp dụng: touch target tối thiểu 44dp, safe area, tôn trọng chế độ giảm chuyển động (reduced motion) cho carousel, tối đa 5 tab ở bottom navigation.
