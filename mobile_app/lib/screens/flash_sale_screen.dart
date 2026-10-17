import 'package:flutter/material.dart';
import '../models/product.dart';
import '../services/api_client.dart';
import '../services/marketing_service.dart';
import '../state/auth_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/product_card.dart';
import 'product_detail_screen.dart';

/// KAN-283: real flash sale deals, backed by GET /flash-sales
/// (was SampleData.flashSaleProducts before).
class FlashSaleScreen extends StatefulWidget {
  const FlashSaleScreen({super.key});

  @override
  State<FlashSaleScreen> createState() => _FlashSaleScreenState();
}

class _FlashSaleScreenState extends State<FlashSaleScreen> {
  final MarketingService _service = MarketingService();
  List<FlashSaleDeal> _deals = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final token = AuthScope.of(context).token;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final deals = await _service.fetchFlashSales(token: token);
      if (!mounted) return;
      setState(() {
        _deals = deals;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error is ApiException ? error.message : 'Không tải được danh sách flash sale';
      });
    }
  }

  Product _toProduct(FlashSaleDeal deal) => Product(
        name: deal.productName,
        price: deal.flashPrice.toInt(),
        comparePrice: deal.originalPrice.toInt(),
        variantId: deal.variantId,
        imageUrl: deal.imageUrl,
        soldCount: deal.soldQty,
        limitCount: deal.limitQty,
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Flash Sale')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      OutlinedButton(onPressed: _load, child: const Text('Thử lại')),
                    ]),
                  ),
                )
              : _deals.isEmpty
                  ? const Center(child: Text('Hiện chưa có flash sale nào', style: TextStyle(color: AppColors.mutedForeground)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: GridView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _deals.length,
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 0.56,
                        ),
                        itemBuilder: (context, i) {
                          final product = _toProduct(_deals[i]);
                          return ProductCard(
                            product: product,
                            width: double.infinity,
                            onTap: () => Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => ProductDetailScreen(product: product)),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
