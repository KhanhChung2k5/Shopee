import 'package:flutter/material.dart';
import '../data/sample_data.dart';
import '../widgets/product_card.dart';
import 'product_detail_screen.dart';

class FlashSaleScreen extends StatelessWidget {
  const FlashSaleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final products = SampleData.flashSaleProducts;

    return Scaffold(
      appBar: AppBar(title: const Text('Flash Sale')),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: products.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.56,
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
