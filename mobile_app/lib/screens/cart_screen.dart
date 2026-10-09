import 'package:flutter/material.dart';
import '../state/cart_scope.dart';
import '../state/cart_state.dart';
import '../theme/app_theme.dart';
import '../widgets/product_thumb.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  String _formatVnd(int value) {
    final s = value.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      final posFromEnd = s.length - i;
      buf.write(s[i]);
      if (posFromEnd > 1 && posFromEnd % 3 == 1) buf.write('.');
    }
    return '₫$buf';
  }

  @override
  Widget build(BuildContext context) {
    final cart = CartScope.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Giỏ hàng')),
      body: AnimatedBuilder(
        animation: cart,
        builder: (context, _) {
          if (cart.lines.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.shopping_cart_outlined, size: 56, color: AppColors.mutedForeground),
                    const SizedBox(height: 16),
                    const Text('Giỏ hàng của bạn đang trống', style: TextStyle(color: AppColors.mutedForeground)),
                  ],
                ),
              ),
            );
          }

          return Column(
            children: [
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: cart.lines.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, i) {
                    final line = cart.lines[i];
                    return Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        boxShadow: const [BoxShadow(color: Color(0x14141414), blurRadius: 8, offset: Offset(0, 2))],
                      ),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: SizedBox(
                              width: 64,
                              height: 64,
                              child: ProductThumb(
                                productType: line.product.productType,
                                imageUrl: line.product.imageUrl,
                                iconScale: 0.45,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(line.product.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                                const SizedBox(height: 6),
                                Text(_formatVnd(line.product.price), style: const TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.w800)),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    _QtyButton(icon: Icons.remove_rounded, onTap: () => cart.updateQuantity(line, line.quantity - 1)),
                                    SizedBox(width: 32, child: Text('${line.quantity}', textAlign: TextAlign.center)),
                                    _QtyButton(
                                      icon: Icons.add_rounded,
                                      onTap: line.product.availableQuantity != null &&
                                              line.quantity >= line.product.availableQuantity!
                                          ? null
                                          : () => cart.updateQuantity(line, line.quantity + 1),
                                    ),
                                    const Spacer(),
                                    IconButton(
                                      onPressed: () => cart.removeLine(line),
                                      icon: const Icon(Icons.delete_outline_rounded, color: AppColors.mutedForeground),
                                      tooltip: 'Xoá',
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              SafeArea(
                top: false,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: AppColors.surface,
                    border: Border(top: BorderSide(color: AppColors.border)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Tổng tiền', style: TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                            Text(_formatVnd(cart.subtotal), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primaryDark)),
                          ],
                        ),
                      ),
                      FilledButton(
                        onPressed: () => _checkout(context, cart),
                        style: FilledButton.styleFrom(minimumSize: const Size(140, 48), backgroundColor: AppColors.primary),
                        child: Text('Đặt hàng (${cart.itemCount})'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _checkout(BuildContext context, CartState cart) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Đặt hàng thành công'),
        content: const Text('Đây là bản demo giao diện — chưa nối với hệ thống thanh toán/đơn hàng thật.'),
        actions: [
          TextButton(
            onPressed: () {
              cart.clear();
              Navigator.of(context).pop();
            },
            child: const Text('Đóng'),
          ),
        ],
      ),
    );
  }
}

class _QtyButton extends StatelessWidget {
  const _QtyButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.background,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 28,
          height: 28,
          child: Icon(icon, size: 15, color: onTap == null ? AppColors.mutedForeground : AppColors.foreground),
        ),
      ),
    );
  }
}
