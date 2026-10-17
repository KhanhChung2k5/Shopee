import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/order_service.dart';
import '../state/auth_scope.dart';
import '../theme/app_theme.dart';

const Map<String, String> _statusLabel = {
  'pending': 'Chờ xác nhận',
  'confirmed': 'Đã xác nhận',
  'cancel_requested': 'Chờ xác nhận huỷ',
  'shipping': 'Đang giao',
  'delivered': 'Đã giao',
  'cancelled': 'Đã huỷ',
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

/// KAN-280: real order detail screen, mirroring web/src/pages/OrderDetailPage.tsx —
/// reads GET /orders/{id}, lets the buyer request cancellation while pending/confirmed.
class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId, this.initial});

  final String orderId;
  /// Optional: the checkout response, so the screen can render instantly
  /// instead of flashing a loading spinner right after placing the order.
  final OrderDetail? initial;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  final OrderService _service = OrderService();
  OrderDetail? _order;
  bool _loading = true;
  String? _error;
  bool _cancelling = false;

  @override
  void initState() {
    super.initState();
    _order = widget.initial;
    _loading = widget.initial == null;
    _load();
  }

  Future<void> _load() async {
    final token = AuthScope.of(context).token;
    if (token == null) return;
    try {
      final order = await _service.fetchOrder(widget.orderId, token: token);
      if (!mounted) return;
      setState(() {
        _order = order;
        _loading = false;
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error is ApiException ? error.message : 'Không tải được chi tiết đơn hàng';
      });
    }
  }

  Future<void> _requestCancel() async {
    final reasonController = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Gửi yêu cầu huỷ đơn'),
        content: TextField(
          controller: reasonController,
          maxLines: 3,
          decoration: const InputDecoration(hintText: 'Lý do huỷ đơn…', border: OutlineInputBorder()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Giữ đơn')),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(reasonController.text.trim()),
            child: const Text('Gửi yêu cầu'),
          ),
        ],
      ),
    );
    if (reason == null || reason.isEmpty) return;

    final token = AuthScope.of(context).token;
    if (token == null) return;
    setState(() => _cancelling = true);
    try {
      await _service.requestCancel(widget.orderId, reason, token: token);
      await _load();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(error is ApiException ? error.message : 'Không thể gửi yêu cầu huỷ đơn'),
      ));
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;
    return Scaffold(
      appBar: AppBar(title: Text(order == null ? 'Chi tiết đơn hàng' : 'Đơn #${order.id.substring(0, order.id.length < 8 ? order.id.length : 8).toUpperCase()}')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null && order == null
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
              : order == null
                  ? const SizedBox.shrink()
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(_statusLabel[order.status] ?? order.status,
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.primaryDark)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          _SectionCard(
                            title: 'Sản phẩm (${order.items.length})',
                            child: Column(
                              children: order.items
                                  .map((item) => Padding(
                                        padding: const EdgeInsets.symmetric(vertical: 6),
                                        child: Row(
                                          children: [
                                            Expanded(
                                              child: Text('${item.productName} × ${item.quantity}',
                                                  style: const TextStyle(fontSize: 13)),
                                            ),
                                            Text(_formatVnd(item.lineTotal),
                                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                          ],
                                        ),
                                      ))
                                  .toList(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          _SectionCard(
                            title: 'Giao hàng',
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(order.shippingAddressSnapshot, style: const TextStyle(fontSize: 13)),
                              if (order.shippingProviderName != null) ...[
                                const SizedBox(height: 4),
                                Text('Đơn vị: ${order.shippingProviderName}', style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                              ],
                              if (order.trackingNo != null) ...[
                                const SizedBox(height: 4),
                                Text('Mã vận đơn: ${order.trackingNo}', style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                              ],
                            ]),
                          ),
                          const SizedBox(height: 12),
                          _SectionCard(
                            title: 'Thanh toán',
                            child: Column(children: [
                              _PriceRow('Tạm tính', order.subtotalAmount),
                              _PriceRow('Giảm giá', -order.discountAmount),
                              _PriceRow('Phí vận chuyển', order.shippingFeeAmount),
                              const Divider(),
                              _PriceRow('Tổng cộng', order.totalAmount, bold: true),
                            ]),
                          ),
                          if (order.statusHistory.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            _SectionCard(
                              title: 'Hành trình đơn hàng',
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: order.statusHistory
                                    .map((entry) => Padding(
                                          padding: const EdgeInsets.symmetric(vertical: 4),
                                          child: Text(
                                            '• ${_statusLabel[entry.status] ?? entry.status}${entry.reason != null ? ' — ${entry.reason}' : ''}',
                                            style: const TextStyle(fontSize: 12.5),
                                          ),
                                        ))
                                    .toList(),
                              ),
                            ),
                          ],
                          if (order.status == 'pending' || order.status == 'confirmed') ...[
                            const SizedBox(height: 16),
                            OutlinedButton(
                              onPressed: _cancelling ? null : _requestCancel,
                              style: OutlinedButton.styleFrom(
                                minimumSize: const Size.fromHeight(44),
                                foregroundColor: AppColors.urgent,
                                side: const BorderSide(color: AppColors.urgent),
                              ),
                              child: Text(_cancelling ? 'Đang gửi…' : 'Gửi yêu cầu huỷ đơn'),
                            ),
                          ],
                        ],
                      ),
                    ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        boxShadow: const [BoxShadow(color: Color(0x14141414), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

class _PriceRow extends StatelessWidget {
  const _PriceRow(this.label, this.value, {this.bold = false});
  final String label;
  final num value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    final sign = value < 0 ? '− ' : '';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: bold ? 14 : 13, fontWeight: bold ? FontWeight.w700 : FontWeight.w400)),
          Text('$sign${_formatVnd(value.abs())}',
              style: TextStyle(
                fontSize: bold ? 16 : 13,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
                color: bold ? AppColors.primaryDark : AppColors.foreground,
              )),
        ],
      ),
    );
  }
}
