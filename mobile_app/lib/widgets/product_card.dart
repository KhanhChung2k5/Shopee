import 'package:flutter/material.dart';
import '../models/product.dart';
import '../theme/app_theme.dart';
import 'product_thumb.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product, this.width = 150, this.onTap});

  final Product product;
  final double width;
  final VoidCallback? onTap;

  static const Map<String, Color> _ageRatingColors = {
    '3+': Color(0xFF16A34A),
    '12+': Color(0xFFCA8A04),
    '16+': Color(0xFFEA580C),
    '18+': Color(0xFFDC2626),
  };

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

  @override
  Widget build(BuildContext context) {
    final hasProgress = product.limitCount != null;

    return SizedBox(
      width: width,
      child: Semantics(
        label: '${product.name}, giá ${_formatVnd(product.price)}, giảm ${product.discountPercent} phần trăm',
        button: onTap != null,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.md),
            boxShadow: const [
              BoxShadow(color: Color(0x14141414), blurRadius: 10, offset: Offset(0, 3)),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onTap,
              child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AspectRatio(
                aspectRatio: 1,
                child: Stack(
                  children: [
                    ProductThumb(productType: product.productType, imageUrl: product.imageUrl),
                    if (product.discountPercent > 0)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.urgent,
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: Text(
                            '-${product.discountPercent}%',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                    if (product.platforms != null && product.platforms!.isNotEmpty)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.72),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: Text(
                            product.platforms!.length > 1
                                ? '${product.platforms!.first} +${product.platforms!.length - 1}'
                                : product.platforms!.first,
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, height: 1.3),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Flexible(
                          child: Text(
                            _formatVnd(product.price),
                            style: const TextStyle(
                              color: AppColors.primaryDark,
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            _formatVnd(product.comparePrice),
                            style: const TextStyle(
                              color: AppColors.mutedForeground,
                              fontSize: 11,
                              decoration: TextDecoration.lineThrough,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (product.productType == ProductType.gameDisc && product.ageRating != null) ...[
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: _ageRatingColors[product.ageRating] ?? AppColors.mutedForeground,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              product.ageRating!,
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (hasProgress) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: product.soldProgress,
                          minHeight: 6,
                          backgroundColor: AppColors.primaryLight,
                          valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Đã bán ${(product.soldProgress * 100).round()}%',
                        style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                      ),
                    ] else ...[
                      Row(
                        children: [
                          const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF5A623)),
                          const SizedBox(width: 3),
                          Text('${product.rating}', style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                          const SizedBox(width: 8),
                          Text('Đã bán ${product.soldLabel}', style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground)),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
