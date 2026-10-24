import 'package:flutter/material.dart';
import '../services/address_service.dart';
import '../services/api_client.dart';
import '../services/order_service.dart';
import '../state/auth_scope.dart';
import '../state/cart_scope.dart';
import '../state/cart_state.dart';
import '../theme/app_theme.dart';
import '../widgets/product_thumb.dart';
import 'addresses_screen.dart';
import 'login_screen.dart';
import 'order_detail_screen.dart';

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

  /// KAN-280: real checkout — picks/creates a shipping address, asks for a
  /// payment method, then calls POST /orders. Any cart line without a real
  /// `variantId` (demo/sample product, not fetched from the catalog API)
  /// blocks checkout, since the backend has no such variant to sell.
  Future<void> _checkout(BuildContext context, CartState cart) async {
    final auth = AuthScope.of(context);
    if (!auth.isLoggedIn || auth.token == null) {
      await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
      return;
    }
    final token = auth.token!;

    final missingVariant = cart.lines.any((line) => line.product.variantId == null);
    if (missingVariant) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Một số sản phẩm trong giỏ chưa có dữ liệu đặt hàng thật — vui lòng thêm lại từ trang sản phẩm.'),
      ));
      return;
    }

    final address = await Navigator.of(context).push<Address>(
      MaterialPageRoute(builder: (_) => const AddressesScreen(selectMode: true)),
    );
    if (address == null || !context.mounted) return;

    final paymentMethod = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Chọn phương thức thanh toán', style: TextStyle(fontWeight: FontWeight.w800)),
            ),
            ListTile(
              leading: const Icon(Icons.payments_outlined),
              title: const Text('Thanh toán khi nhận hàng (COD)'),
              onTap: () => Navigator.of(context).pop('cod'),
            ),
          ],
        ),
      ),
    );
    if (paymentMethod == null || !context.mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final order = await OrderService().checkout(
        addressId: address.id,
        paymentMethod: paymentMethod,
        token: token,
      );
      cart.clear();
      if (!context.mounted) return;
      Navigator.of(context).pop(); // close loading dialog
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: order.id, initial: order)),
      );
    } catch (error) {
      if (!context.mounted) return;
      Navigator.of(context).pop(); // close loading dialog
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(error is ApiException ? error.message : 'Đặt hàng thất bại, vui lòng thử lại'),
      ));
    }
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
