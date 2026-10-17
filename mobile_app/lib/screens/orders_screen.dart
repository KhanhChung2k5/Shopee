import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/order_service.dart';
import '../state/auth_scope.dart';
import '../theme/app_theme.dart';
import 'login_screen.dart';
import 'order_detail_screen.dart';

const Map<String, String> _statusLabel = {
  'pending': 'Chờ xác nhận',
  'confirmed': 'Đã xác nhận',
  'cancel_requested': 'Chờ xác nhận huỷ',
  'shipping': 'Đang giao',
  'delivered': 'Hoàn thành',
  'cancelled': 'Đã huỷ',
};

Color _statusColor(String status) => switch (status) {
      'delivered' => AppColors.trust,
      'cancelled' => AppColors.mutedForeground,
      'cancel_requested' => AppColors.urgent,
      _ => AppColors.primary,
    };

String _formatVnd(num value) {
  final s = value.toInt().toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    final posFromEnd = s.length - i;
    buf.write(s[i]);
    if (posFromEnd > 1 && posFromEnd % 3 == 1) buf.write('.');
  }
  return '₫$buf';
}

/// KAN-280: real order history, backed by GET /orders (was a hardcoded list before).
class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final OrderService _service = OrderService();
  List<OrderSummary> _orders = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final token = AuthScope.of(context).token;
    if (token == null) {
      setState(() => _loading = false);
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final orders = await _service.fetchOrders(token: token);
      if (!mounted) return;
      setState(() {
        _orders = orders;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error is ApiException ? error.message : 'Không tải được danh sách đơn hàng';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = AuthScope.of(context);

    if (!auth.isLoggedIn) {
      return Scaffold(
        appBar: AppBar(title: const Text('Đơn hàng của tôi')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('Đăng nhập để xem đơn hàng của bạn', textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen())),
                child: const Text('Đăng nhập'),
              ),
            ]),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Đơn hàng của tôi')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      OutlinedButton(onPressed: _load, child: const Text('Thử lại')),
                    ]),
                  ),
                )
              : _orders.isEmpty
                  ? const Center(child: Text('Bạn chưa có đơn hàng nào', style: TextStyle(color: AppColors.mutedForeground)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _orders.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, i) {
                          final order = _orders[i];
                          return InkWell(
                            borderRadius: BorderRadius.circular(AppRadius.md),
                            onTap: () => Navigator.of(context)
                                .push(MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: order.id)))
                                .then((_) => _load()),
                            child: Container(
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
                                      Text('#${order.id.substring(0, order.id.length < 8 ? order.id.length : 8).toUpperCase()}',
                                          style: const TextStyle(fontWeight: FontWeight.w700)),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: _statusColor(order.status).withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: Text(_statusLabel[order.status] ?? order.status,
                                            style: TextStyle(color: _statusColor(order.status), fontSize: 11.5, fontWeight: FontWeight.w700)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text('${order.itemCount} sản phẩm · Tổng ${_formatVnd(order.totalAmount)}',
                                      style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
