import 'package:flutter/material.dart';

import '../data/sample_data.dart';
import '../models/product.dart';
import '../services/catalog_service.dart';
import '../theme/app_theme.dart';
import '../widgets/product_card.dart';
import 'product_detail_screen.dart';

class CategoryProductsScreen extends StatefulWidget {
  const CategoryProductsScreen({super.key, required this.category, this.catalogService});

  final CategoryItem category;
  final CatalogService? catalogService;

  @override
  State<CategoryProductsScreen> createState() => _CategoryProductsScreenState();
}

class _CategoryProductsScreenState extends State<CategoryProductsScreen> {
  static const _pageSize = 20;
  late final CatalogService _catalog = widget.catalogService ?? CatalogService();
  List<Product> _products = [];
  bool _loading = true;
  bool _loadingMore = false;
  bool _usingSampleData = false;
  String? _error;
  int _nextPage = 0;
  int _totalPages = 0;

  @override
  void initState() {
    super.initState();
    _loadFirstPage();
  }

  Future<void> _loadFirstPage() async {
    if (widget.category.id == null) {
      setState(() {
        _products = SampleData.suggestedProducts;
        _usingSampleData = true;
        _loading = false;
      });
      return;
    }

    try {
      final result = await _catalog.fetchProducts(categoryId: widget.category.id, page: 0, size: _pageSize);
      if (!mounted) return;
      setState(() {
        _products = result.products;
        _nextPage = 1;
        _totalPages = result.totalPages;
        _error = null;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _products = SampleData.suggestedProducts;
        _usingSampleData = true;
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || _nextPage >= _totalPages || widget.category.id == null) return;
    setState(() => _loadingMore = true);
    try {
      final result = await _catalog.fetchProducts(
        categoryId: widget.category.id,
        page: _nextPage,
        size: _pageSize,
      );
      if (!mounted) return;
      setState(() {
        _products = [..._products, ...result.products];
        _nextPage = result.page + 1;
        _totalPages = result.totalPages;
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  void _openProduct(Product product) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ProductDetailScreen(product: product, catalogService: _catalog),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.category.label)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (_usingSampleData)
                  _CatalogNotice(
                    text: widget.category.id == null
                        ? 'Danh mục mẫu chưa có mã API; đang hiển thị sản phẩm minh hoạ.'
                        : 'Không tải được sản phẩm từ máy chủ; đang hiển thị dữ liệu mẫu.',
                  ),
                if (_error != null && !_usingSampleData)
                  _CatalogNotice(text: 'Không tải thêm được sản phẩm: $_error'),
                Expanded(
                  child: _products.isEmpty
                      ? const Center(child: Text('Danh mục này chưa có sản phẩm.'))
                      : GridView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _products.length,
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                            childAspectRatio: 0.6,
                          ),
                          itemBuilder: (context, i) => ProductCard(
                            product: _products[i],
                            width: double.infinity,
                            onTap: () => _openProduct(_products[i]),
                          ),
                        ),
                ),
                if (_nextPage < _totalPages && !_usingSampleData)
                  SafeArea(
                    top: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                      child: OutlinedButton(
                        onPressed: _loadingMore ? null : _loadMore,
                        child: _loadingMore
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Text('Xem thêm sản phẩm'),
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}

class _CatalogNotice extends StatelessWidget {
  const _CatalogNotice({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        color: AppColors.primaryLight,
        child: Text(text, style: const TextStyle(fontSize: 12, color: AppColors.primaryDark)),
      );
}
