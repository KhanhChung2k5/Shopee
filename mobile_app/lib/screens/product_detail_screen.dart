import 'package:flutter/material.dart';
import '../models/product.dart';
import '../state/cart_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/product_thumb.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key, required this.product});

  final Product product;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _quantity = 1;

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

  bool _hasSpecs(Product p) =>
      p.platforms != null ||
      p.publisher != null ||
      p.genre != null ||
      p.ageRating != null ||
      p.connectionType != null ||
      p.warrantyMonths != null;

  List<Widget> _specRows(Product p) {
    final rows = <Widget>[];
    if (p.platforms != null) {
      rows.add(_SpecRow(label: 'Nền tảng', value: p.platforms!.join(', ')));
    }
    if (p.productType == ProductType.gameDisc && p.publisher != null) {
      rows.add(_SpecRow(label: 'Nhà phát hành', value: p.publisher!));
    }
    if (p.productType == ProductType.gameDisc && p.genre != null) {
      rows.add(_SpecRow(label: 'Thể loại', value: p.genre!));
    }
    if (p.productType == ProductType.gameDisc && p.ageRating != null) {
      rows.add(_SpecRow(label: 'Phân loại độ tuổi', value: p.ageRating!));
    }
    if (p.connectionType != null) {
      rows.add(_SpecRow(label: 'Kết nối', value: p.connectionType!.label));
    }
    if (p.warrantyMonths != null) {
      rows.add(_SpecRow(label: 'Bảo hành', value: '${p.warrantyMonths} tháng'));
    }
    return rows;
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.product;

    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết sản phẩm')),
      body: ListView(
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: ProductThumb(productType: p.productType, iconScale: 0.32),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(p.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      _formatVnd(p.price),
                      style: const TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.w800, fontSize: 22),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      _formatVnd(p.comparePrice),
                      style: const TextStyle(color: AppColors.mutedForeground, decoration: TextDecoration.lineThrough),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: AppColors.urgent, borderRadius: BorderRadius.circular(5)),
                      child: Text('-${p.discountPercent}%', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (p.rating != null)
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, size: 18, color: Color(0xFFF5A623)),
                      const SizedBox(width: 4),
                      Text('${p.rating}', style: const TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(width: 12),
                      Text('Đã bán ${p.soldLabel ?? "-"}', style: const TextStyle(color: AppColors.mutedForeground)),
                    ],
                  ),
                if (_hasSpecs(p)) ...[
                  const SizedBox(height: 4),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: _specRows(p),
                    ),
                  ),
                ],
                const Divider(height: 32),
                const Text('Mô tả sản phẩm', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                const SizedBox(height: 8),
                const Text(
                  'Đây là dữ liệu mô tả mẫu minh hoạ cho mục đích demo giao diện — chưa nối với dữ liệu sản phẩm thật.',
                  style: TextStyle(color: AppColors.mutedForeground, height: 1.5),
                ),
                const Divider(height: 32),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Số lượng', style: TextStyle(fontWeight: FontWeight.w600)),
                    Row(
                      children: [
                        _StepperButton(
                          icon: Icons.remove_rounded,
                          onTap: _quantity > 1 ? () => setState(() => _quantity--) : null,
                        ),
                        SizedBox(width: 40, child: Text('$_quantity', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700))),
                        _StepperButton(icon: Icons.add_rounded, onTap: () => setState(() => _quantity++)),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    CartScope.of(context).addProduct(p, quantity: _quantity);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Đã thêm $_quantity "${p.name}" vào giỏ hàng')),
                    );
                  },
                  icon: const Icon(Icons.add_shopping_cart_rounded, size: 18),
                  label: const Text('Thêm vào giỏ'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 48),
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: () {
                    CartScope.of(context).addProduct(p, quantity: _quantity);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Đã thêm vào giỏ — vào tab Giỏ hàng để thanh toán (demo)')),
                    );
                  },
                  style: FilledButton.styleFrom(minimumSize: const Size(0, 48), backgroundColor: AppColors.primary),
                  child: const Text('Mua ngay'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SpecRow extends StatelessWidget {
  const _SpecRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 140, child: Text(label, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13.5))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5))),
        ],
      ),
    );
  }
}

class _StepperButton extends StatelessWidget {
  const _StepperButton({required this.icon, required this.onTap});
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
          width: 36,
          height: 36,
          child: Icon(icon, size: 18, color: onTap == null ? AppColors.mutedForeground : AppColors.foreground),
        ),
      ),
    );
  }
}
