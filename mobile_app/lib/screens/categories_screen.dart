import 'package:flutter/material.dart';

import '../data/sample_data.dart';
import '../models/product.dart';
import '../services/catalog_service.dart';
import '../theme/app_theme.dart';
import 'category_products_screen.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key, this.catalogService});

  final CatalogService? catalogService;

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  late final CatalogService _catalog = widget.catalogService ?? CatalogService();
  List<CategoryItem> _categories = SampleData.categories;
  bool _loading = true;
  bool _usingSampleData = false;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    try {
      final categories = await _catalog.fetchCategories();
      if (!mounted) return;
      setState(() {
        if (categories.isNotEmpty) {
          _categories = categories;
        } else {
          _categories = SampleData.categories;
          _usingSampleData = true;
        }
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _categories = SampleData.categories;
        _usingSampleData = true;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Danh mục')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                if (_usingSampleData)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    color: AppColors.primaryLight,
                    child: const Text(
                      'Không tải được danh mục từ máy chủ; đang giữ dữ liệu mẫu để màn hình không bị trống.',
                      style: TextStyle(fontSize: 12, color: AppColors.primaryDark),
                    ),
                  ),
                Expanded(
                  child: ListView.separated(
                    itemCount: _categories.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.border),
                    itemBuilder: (context, i) {
                      final category = _categories[i];
                      return ListTile(
                        leading: Container(
                          width: 40,
                          height: 40,
                          decoration: const BoxDecoration(color: AppColors.primaryLight, shape: BoxShape.circle),
                          child: Icon(category.icon, color: AppColors.primaryDark, size: 20),
                        ),
                        title: Text(category.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                        trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.mutedForeground),
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(
                          builder: (_) => CategoryProductsScreen(category: category, catalogService: _catalog),
                        )),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
