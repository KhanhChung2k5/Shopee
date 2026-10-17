import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  static const _items = [
    (icon: Icons.local_shipping_outlined, title: 'Đơn hàng #DH240915 đang được giao', time: '5 phút trước'),
    (icon: Icons.local_offer_outlined, title: 'Voucher ₫50K sắp hết hạn', time: '2 giờ trước'),
    (icon: Icons.star_border_rounded, title: 'Đừng quên đánh giá sản phẩm đã mua', time: '1 ngày trước'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Thông báo')),
      body: ListView.separated(
        itemCount: _items.length,
        separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.border),
        itemBuilder: (context, i) {
          final n = _items[i];
          return ListTile(
            leading: CircleAvatar(backgroundColor: AppColors.primaryLight, child: Icon(n.icon, color: AppColors.primaryDark, size: 20)),
            title: Text(n.title, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
            subtitle: Text(n.time, style: const TextStyle(fontSize: 11.5)),
          );
        },
      ),
    );
  }
}
