import 'package:flutter/material.dart';
import '../data/sample_data.dart';
import '../models/product.dart';
import '../services/catalog_service.dart';
import '../state/cart_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/category_grid.dart';
import '../widgets/flash_sale_countdown.dart';
import '../widgets/hero_carousel.dart';
import '../widgets/product_card.dart';
import '../widgets/section_header.dart';
import '../widgets/voucher_card.dart';
import 'category_products_screen.dart';
import 'flash_sale_screen.dart';
import 'notifications_screen.dart';
import 'product_detail_screen.dart';
import 'cart_screen.dart';
import 'vouchers_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, this.catalogService});

  final CatalogService? catalogService;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final DateTime _flashSaleEndsAt = DateTime.now().add(const Duration(hours: 3, minutes: 15));
  late final CatalogService _catalog = widget.catalogService ?? CatalogService();

  List<CategoryItem> _categories = SampleData.categories;
  List<Product> _suggestedProducts = SampleData.suggestedProducts;
  bool _categoriesFallback = false;
  bool _productsFallback = false;

  static const _pageSize = 10;
  int _visibleSuggested = _pageSize;

  @override
  void initState() {
    super.initState();
    _loadCategories();
    _loadSuggestedProducts();
  }

  Future<void> _loadCategories() async {
    try {
      final categories = await _catalog.fetchCategories();
      if (!mounted) return;
      setState(() {
        if (categories.isNotEmpty) {
          _categories = categories;
        } else {
          _categoriesFallback = true;
        }
      });
    } catch (_) {
      if (mounted) setState(() => _categoriesFallback = true);
    }
  }

  Future<void> _loadSuggestedProducts() async {
    try {
      final result = await _catalog.fetchProducts(page: 0, size: 100);
      if (!mounted) return;
      setState(() {
        _suggestedProducts = result.products;
        _visibleSuggested = _pageSize;
      });
    } catch (_) {
      if (mounted) setState(() => _productsFallback = true);
    }
  }

  void _openProduct(Product product) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ProductDetailScreen(product: product, catalogService: _catalog),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final suggested = _suggestedProducts;
    final visibleSuggested = suggested.take(_visibleSuggested).toList();
    final cart = CartScope.of(context);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 12,
        title: _SearchField(
          onTap: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Demo — chưa nối tính năng tìm kiếm thật')),
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Thông báo',
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NotificationsScreen())),
            icon: const _BadgedIcon(icon: Icons.notifications_none_rounded, count: 3),
          ),
          IconButton(
            tooltip: 'Giỏ hàng',
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CartScreen())),
            icon: AnimatedBuilder(
              animation: cart,
              builder: (context, _) => _BadgedIcon(icon: Icons.shopping_cart_outlined, count: cart.itemCount),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          key: const Key('home-scroll-view'),
          padding: const EdgeInsets.only(bottom: 24),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              child: HeroCarousel(slides: SampleData.banners),
            ),
            const SectionHeader(title: 'Danh mục nổi bật'),
            if (_categoriesFallback)
              const _CatalogFallbackNote(text: 'Đang giữ danh mục mẫu vì máy chủ chưa trả danh sách danh mục.'),
            CategoryGrid(
              categories: _categories,
              onCategoryTap: (c) => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => CategoryProductsScreen(category: c, catalogService: _catalog)),
              ),
            ),
            const SizedBox(height: 28),
            _FlashSaleSection(endsAt: _flashSaleEndsAt, onProductTap: _openProduct),
            const SizedBox(height: 28),
            SectionHeader(
              title: 'Mã giảm giá dành cho bạn',
              onSeeAll: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const VouchersScreen())),
            ),
            SizedBox(
              height: 104,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: SampleData.vouchers.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, i) => VoucherCard(voucher: SampleData.vouchers[i]),
              ),
            ),
            const SizedBox(height: 28),
            const SectionHeader(title: 'Gợi ý hôm nay'),
            if (_productsFallback)
              const _CatalogFallbackNote(text: 'Không kết nối được Catalog API; đang hiển thị sản phẩm mẫu.'),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: suggested.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.symmetric(vertical: 28),
                      child: Center(child: Text('Chưa có sản phẩm để gợi ý.')),
                    )
                  : GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: visibleSuggested.length,
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 0.6,
                      ),
                      itemBuilder: (context, i) => ProductCard(
                        product: visibleSuggested[i],
                        width: double.infinity,
                        onTap: () => _openProduct(visibleSuggested[i]),
                      ),
                    ),
            ),
            if (_visibleSuggested < suggested.length)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Center(
                  child: OutlinedButton(
                    onPressed: () => setState(() => _visibleSuggested += _pageSize),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 44),
                      side: const BorderSide(color: AppColors.primary),
                      foregroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                    ),
                    child: const Text('Xem thêm sản phẩm'),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CatalogFallbackNote extends StatelessWidget {
  const _CatalogFallbackNote({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
        child: Text(text, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
      );
}

class _FlashSaleSection extends StatelessWidget {
  const _FlashSaleSection({required this.endsAt, required this.onProductTap});
  final DateTime endsAt;
  final ValueChanged<Product> onProductTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.local_fire_department_rounded, color: AppColors.urgent, size: 22),
                  const SizedBox(width: 6),
                  const Text('Flash Sale', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.urgent)),
                  const Spacer(),
                  TextButton(
                    onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const FlashSaleScreen())),
                    style: TextButton.styleFrom(foregroundColor: AppColors.primary, minimumSize: const Size(44, 44)),
                    child: const Text('Xem tất cả'),
                  ),
                ],
              ),
              FlashSaleCountdown(endsAt: endsAt),
            ],
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 268,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: SampleData.flashSaleProducts.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, i) => ProductCard(
              product: SampleData.flashSaleProducts[i],
              onTap: () => onProductTap(SampleData.flashSaleProducts[i]),
            ),
          ),
        ),
      ],
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Container(
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              const SizedBox(width: 14),
              const Icon(Icons.search_rounded, size: 18, color: AppColors.mutedForeground),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Tìm sản phẩm, thương hiệu...',
                  style: TextStyle(color: AppColors.mutedForeground, fontSize: 13),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BadgedIcon extends StatelessWidget {
  const _BadgedIcon({required this.icon, required this.count});
  final IconData icon;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon),
        if (count > 0)
          Positioned(
            top: -4,
            right: -6,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: const BoxDecoration(color: AppColors.urgent, shape: BoxShape.circle),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              child: Text(
                '$count',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
              ),
            ),
          ),
      ],
    );
  }
}
