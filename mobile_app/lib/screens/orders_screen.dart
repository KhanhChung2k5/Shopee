import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  static const _orders = [
    (id: '#DH240915', status: 'Đang giao', statusColor: AppColors.primary, total: '₫890.000', items: 2),
    (id: '#DH240902', status: 'Hoàn thành', statusColor: AppColors.trust, total: '₫349.000', items: 1),
    (id: '#DH240817', status: 'Đã huỷ', statusColor: AppColors.mutedForeground, total: '₫129.000', items: 1),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Đơn hàng của tôi')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _orders.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) {
          final o = _orders[i];
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.md),
              boxShadow: const [BoxShadow(color: Color(0x14141414), blurRadius: 8, offset: Offset(0, 2))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(o.id, style: const TextStyle(fontWeight: FontWeight.w700)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: o.statusColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
                      child: Text(o.status, style: TextStyle(color: o.statusColor, fontSize: 11.5, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text('${o.items} sản phẩm · Tổng ${o.total}', style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
              ],
            ),
          );
        },
      ),
    );
  }
}
