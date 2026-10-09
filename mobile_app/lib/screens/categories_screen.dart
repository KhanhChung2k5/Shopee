import 'package:flutter/material.dart';
import '../data/sample_data.dart';
import '../theme/app_theme.dart';
import 'category_products_screen.dart';

class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final categories = SampleData.categories;

    return Scaffold(
      appBar: AppBar(title: const Text('Danh mục')),
      body: ListView.separated(
        itemCount: categories.length,
        separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.border),
        itemBuilder: (context, i) {
          final c = categories[i];
          return ListTile(
            leading: Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(color: AppColors.primaryLight, shape: BoxShape.circle),
              child: Icon(c.icon, color: AppColors.primaryDark, size: 20),
            ),
            title: Text(c.label, style: const TextStyle(fontWeight: FontWeight.w600)),
            trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.mutedForeground),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => CategoryProductsScreen(category: c)),
            ),
          );
        },
      ),
    );
  }
}
