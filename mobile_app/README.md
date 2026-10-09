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
- `lib/models/product.dart` — model Product/Voucher/Banner/Category cho mockup.
- `lib/data/sample_data.dart` — dữ liệu mẫu (chưa nối API thật).
- `lib/widgets/` — các thành phần: hero carousel, flash sale countdown, product card, voucher card, category grid.
- `lib/screens/home_screen.dart` — màn hình trang chủ, ghép toàn bộ widget + bottom navigation bar (5 tab theo giới hạn UX khuyến nghị).

## Ghi chú

- Dữ liệu sản phẩm/giá/rating/voucher là dữ liệu mẫu minh hoạ.
- Ảnh sản phẩm dùng khối màu placeholder (chưa có ảnh thật).
- Đã áp dụng: touch target tối thiểu 44dp, safe area, tôn trọng chế độ giảm chuyển động (reduced motion) cho carousel, tối đa 5 tab ở bottom navigation.
