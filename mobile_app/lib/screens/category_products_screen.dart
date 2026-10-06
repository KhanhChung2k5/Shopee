import 'package:flutter/material.dart';
import '../data/sample_data.dart';
import '../models/product.dart';
import 'product_detail_screen.dart';
import '../widgets/product_card.dart';

/// Shows products for one category. The demo data isn't tagged by category,
/// so this reuses the shared suggested-products pool to prove the navigation
/// and layout, not real category filtering.
class CategoryProductsScreen extends StatelessWidget {
  const CategoryProductsScreen({super.key, required this.category});

  final CategoryItem category;

  @override
  Widget build(BuildContext context) {
    final products = SampleData.suggestedProducts;

    return Scaffold(
      appBar: AppBar(title: Text(category.label)),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: products.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.6,
        ),
        itemBuilder: (context, i) => ProductCard(
          product: products[i],
          width: double.infinity,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => ProductDetailScreen(product: products[i])),
          ),
        ),
      ),
    );
  }
}
