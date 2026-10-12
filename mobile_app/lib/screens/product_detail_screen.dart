import 'package:flutter/material.dart';

import '../models/product.dart';
import '../services/catalog_service.dart';
import '../state/cart_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/product_thumb.dart';

class ProductDetailScreen extends StatefulWidget {
  const ProductDetailScreen({super.key, required this.product, this.catalogService});

  final Product product;
  final CatalogService? catalogService;

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  late final CatalogService _catalog = widget.catalogService ?? CatalogService();
  int _quantity = 1;
  Product? _selectedProduct;
  CatalogProductDetails? _details;
  bool _loadingDetails = false;
  String? _detailsError;

  @override
  void initState() {
    super.initState();
    _selectedProduct = widget.product;
    if (widget.product.id != null) {
      _loadingDetails = true;
      _loadDetails();
    }
  }

  Future<void> _loadDetails() async {
    try {
      final details = await _catalog.fetchProduct(widget.product.id!);
      if (!mounted) return;
      final variants = details.variants.where((variant) => variant.id.isNotEmpty).toList()
        ..sort((a, b) => a.price.compareTo(b.price));
      setState(() {
        _details = details;
        if (variants.isNotEmpty) _selectedProduct = details.toProduct(variants.first);
        _loadingDetails = false;
        if (variants.isEmpty) _detailsError = 'Sản phẩm hiện chưa có biến thể để đặt hàng.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _detailsError = 'Không tải được giá và tồn kho hiện tại: $error';
        _loadingDetails = false;
      });
    }
  }

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
      p.brandName != null || p.platforms != null || p.publisher != null || p.genre != null || p.ageRating != null ||
      p.releaseDate != null || p.connectionType != null || p.warrantyMonths != null ||
      p.originCountry != null || p.sku != null;

  List<Widget> _specRows(Product p) {
    final rows = <Widget>[];
    if (p.brandName != null) rows.add(_SpecRow(label: 'Thương hiệu', value: p.brandName!));
    if (p.platforms != null) rows.add(_SpecRow(label: 'Nền tảng', value: p.platforms!.join(', ')));
    if (p.productType == ProductType.gameDisc && p.publisher != null) {
      rows.add(_SpecRow(label: 'Nhà phát hành', value: p.publisher!));
    }
    if (p.productType == ProductType.gameDisc && p.genre != null) {
      rows.add(_SpecRow(label: 'Thể loại', value: p.genre!));
    }
    if (p.productType == ProductType.gameDisc && p.ageRating != null) {
      rows.add(_SpecRow(label: 'Phân loại độ tuổi', value: p.ageRating!));
    }
    if (p.releaseDate != null) rows.add(_SpecRow(label: 'Ngày phát hành', value: p.releaseDate!));
    if (p.connectionType != null) rows.add(_SpecRow(label: 'Kết nối', value: p.connectionType!.label));
    if (p.warrantyMonths != null) rows.add(_SpecRow(label: 'Bảo hành', value: '${p.warrantyMonths} tháng'));
    if (p.originCountry != null) rows.add(_SpecRow(label: 'Xuất xứ', value: p.originCountry!));
    if (p.sku != null) rows.add(_SpecRow(label: 'Mã sản phẩm', value: p.sku!));
    return rows;
  }

  void _selectVariant(String variantId) {
    final details = _details;
    if (details == null) return;
    for (final variant in details.variants) {
      if (variant.id == variantId) {
        setState(() {
          _selectedProduct = details.toProduct(variant);
          _quantity = 1;
          _detailsError = null;
        });
        return;
      }
    }
  }

  void _addToCart(Product product, {required bool buyNow}) {
    if (product.availableQuantity == 0) return;
    CartScope.of(context).addProduct(product, quantity: _quantity);
    final message = buyNow
        ? 'Đã thêm vào giỏ — vào tab Giỏ hàng để thanh toán (demo)'
        : 'Đã thêm $_quantity "${product.name}" vào giỏ hàng';
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final p = _selectedProduct ?? widget.product;
    final canPurchase = !_loadingDetails &&
        (p.id == null || (_details != null && p.variantId != null && p.availableQuantity != null));

    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết sản phẩm')),
      body: ListView(
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: ProductThumb(productType: p.productType, imageUrl: p.imageUrl, iconScale: 0.32),
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
                    Text(_formatVnd(p.price), style: const TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.w800, fontSize: 22)),
                    if (p.discountPercent > 0) ...[
                      const SizedBox(width: 10),
                      Text(_formatVnd(p.comparePrice), style: const TextStyle(color: AppColors.mutedForeground, decoration: TextDecoration.lineThrough)),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: AppColors.urgent, borderRadius: BorderRadius.circular(5)),
                        child: Text('-${p.discountPercent}%', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ],
                ),
                if (_loadingDetails) ...[
                  const SizedBox(height: 12),
                  const LinearProgressIndicator(),
                  const SizedBox(height: 6),
                  const Text('Đang tải biến thể và tồn kho…', style: TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
                ],
                if (_details != null && _details!.variants.length > 1) ...[
                  const SizedBox(height: 16),
                  const Text('Chọn biến thể', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    value: p.variantId,
                    isExpanded: true,
                    decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true),
                    items: _details!.variants.map((variant) => DropdownMenuItem(
                      value: variant.id,
                      child: Text(
                        '${variant.sku} · ${_formatVnd(variant.price)} · Còn ${variant.availableQuantity}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    )).toList(),
                    onChanged: (value) { if (value != null) _selectVariant(value); },
                  ),
                ],
                if (p.availableQuantity != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    p.availableQuantity! > 0 ? 'Còn ${p.availableQuantity} sản phẩm' : 'Tạm hết hàng',
                    style: TextStyle(
                      color: p.availableQuantity! > 0 ? AppColors.trust : AppColors.urgent,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
                if (_detailsError != null) ...[
                  const SizedBox(height: 10),
                  Text(_detailsError!, key: const Key('catalog-product-error'), style: const TextStyle(color: AppColors.urgent, fontSize: 12)),
                ],
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
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(8)),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: _specRows(p)),
                  ),
                ],
                const Divider(height: 32),
                const Text('Mô tả sản phẩm', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                const SizedBox(height: 8),
                Text(
                  p.description ?? (p.id == null
                      ? 'Đây là dữ liệu mô tả mẫu minh hoạ cho mục đích demo giao diện.'
                      : 'Sản phẩm chưa có mô tả chi tiết.'),
                  style: const TextStyle(color: AppColors.mutedForeground, height: 1.5),
                ),
                const Divider(height: 32),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Số lượng', style: TextStyle(fontWeight: FontWeight.w600)),
                    Row(
                      children: [
                        _StepperButton(icon: Icons.remove_rounded, onTap: _quantity > 1 ? () => setState(() => _quantity--) : null),
                        SizedBox(width: 40, child: Text('$_quantity', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700))),
                        _StepperButton(
                          icon: Icons.add_rounded,
                          onTap: p.availableQuantity == null || _quantity < p.availableQuantity!
                              ? () => setState(() => _quantity++)
                              : null,
                        ),
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
                  onPressed: canPurchase && p.availableQuantity != 0 ? () => _addToCart(p, buyNow: false) : null,
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
                  onPressed: canPurchase && p.availableQuantity != 0 ? () => _addToCart(p, buyNow: true) : null,
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
