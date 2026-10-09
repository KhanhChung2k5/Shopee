import 'package:flutter/material.dart';

enum ProductType { gameDisc, controller, accessory }

enum ConnectionType { wired, wireless, bluetooth }

extension ConnectionTypeLabel on ConnectionType {
  String get label => switch (this) {
        ConnectionType.wired => 'Có dây',
        ConnectionType.wireless => 'Không dây',
        ConnectionType.bluetooth => 'Bluetooth',
      };
}

/// Mirrors Product/ProductVariant fields from the CRM/e-commerce class
/// diagram v9 (price, comparePrice, productType, platforms, publisher,
/// genre, ageRating, connectionType, warrantyMonths) plus display-only
/// fields used by the mockup. Business: retailer of game controllers and
/// game discs.
class Product {
  const Product({
    required this.name,
    required this.price,
    required this.comparePrice,
    this.rating,
    this.soldLabel,
    this.soldCount,
    this.limitCount,
    this.productType = ProductType.accessory,
    this.platforms,
    this.publisher,
    this.genre,
    this.ageRating,
    this.connectionType,
    this.warrantyMonths,
  });

  final String name;
  final int price;
  final int comparePrice;
  final double? rating;
  final String? soldLabel;
  final int? soldCount;
  final int? limitCount;
  final ProductType productType;
  final List<String>? platforms;
  final String? publisher;
  final String? genre;
  final String? ageRating;
  final ConnectionType? connectionType;
  final int? warrantyMonths;

  int get discountPercent => (100 - (price / comparePrice * 100)).round();

  double get soldProgress =>
      (soldCount != null && limitCount != null && limitCount! > 0)
          ? (soldCount! / limitCount!).clamp(0, 1).toDouble()
          : 0;
}

class VoucherOffer {
  const VoucherOffer({
    required this.amountLabel,
    required this.conditionLabel,
    required this.title,
    required this.expiryLabel,
    this.isShipping = false,
  });

  final String amountLabel;
  final String conditionLabel;
  final String title;
  final String expiryLabel;
  final bool isShipping;
}

class BannerSlide {
  const BannerSlide({
    required this.eyebrow,
    required this.title,
    required this.description,
    required this.ctaLabel,
    required this.gradient,
  });

  final String eyebrow;
  final String title;
  final String description;
  final String ctaLabel;
  final List<Color> gradient;
}

class CategoryItem {
  const CategoryItem({required this.label, required this.icon});
  final String label;
  final IconData icon;
}
