import 'package:flutter/material.dart';
import '../models/product.dart';

/// Gradient + icon per product type, mirroring web/src/components/ProductThumb.tsx
/// so both clients render the same "gaming storefront" visual language
/// instead of a flat placeholder block.
class ProductThumb extends StatelessWidget {
  const ProductThumb({super.key, required this.productType, this.iconScale = 0.42});

  final ProductType productType;
  final double iconScale;

  static const Map<ProductType, List<Color>> _gradients = {
    ProductType.controller: [Color(0xFF3A2420), Color(0xFFF0562E)],
    ProductType.gameDisc: [Color(0xFF241A3A), Color(0xFF7C5CFF)],
    ProductType.accessory: [Color(0xFF12332B), Color(0xFF16A34A)],
  };

  static const Map<ProductType, IconData> _icons = {
    ProductType.controller: Icons.sports_esports_rounded,
    ProductType.gameDisc: Icons.album_rounded,
    ProductType.accessory: Icons.headset_rounded,
  };

  @override
  Widget build(BuildContext context) {
    final colors = _gradients[productType]!;
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = constraints.maxWidth.isFinite ? constraints.maxWidth : 100.0;
        return Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: colors,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Center(
            child: Icon(
              _icons[productType],
              size: size * iconScale,
              color: Colors.white.withValues(alpha: 0.92),
            ),
          ),
        );
      },
    );
  }
}
