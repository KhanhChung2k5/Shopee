import 'package:flutter/material.dart';
import '../models/product.dart';
import '../theme/app_theme.dart';

class CategoryGrid extends StatelessWidget {
  const CategoryGrid({super.key, required this.categories, this.onCategoryTap});

  final List<CategoryItem> categories;
  final ValueChanged<CategoryItem>? onCategoryTap;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: categories.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.82,
      ),
      itemBuilder: (context, i) {
        final c = categories[i];
        return Semantics(
          button: true,
          label: c.label,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(AppRadius.md),
              onTap: onCategoryTap == null ? null : () => onCategoryTap!(c),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(color: AppColors.primaryLight, shape: BoxShape.circle),
                    child: Icon(c.icon, color: AppColors.primaryDark, size: 24),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    c.label,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
