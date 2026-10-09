import 'package:flutter/material.dart';

import '../models/product.dart';
import 'api_client.dart';

class CatalogService {
  CatalogService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  Future<List<CategoryItem>> fetchCategories() async {
    final response = await _api.getList('/api/catalog/categories');
    return response.map((value) {
      final json = _asMap(value);
      return CategoryItem(
        id: _string(json['id']),
        slug: _string(json['slug']),
        label: _string(json['name']) ?? 'Danh mục',
        icon: _categoryIcon(_string(json['name']) ?? ''),
      );
    }).where((category) => category.id != null).toList();
  }

  Future<CatalogProductPage> fetchProducts({String? categoryId, int page = 0, int size = 100}) async {
    final query = <String, String>{'page': '$page', 'size': '$size'};
    if (categoryId != null) query['categoryId'] = categoryId;
    final encoded = Uri(queryParameters: query).query;
    final json = await _api.get('/api/products?$encoded');
    final content = json['content'];
    if (content is! List) throw const FormatException('Product response has no content array.');
    final products = content.map((value) => _summaryToProduct(_asMap(value))).whereType<Product>().toList();
    return CatalogProductPage(
      products: products,
      page: _integer(json['page']) ?? page,
      totalPages: _integer(json['totalPages']) ?? 0,
    );
  }

  Future<CatalogProductDetails> fetchProduct(String id) async {
    final json = await _api.get('/api/products/${Uri.encodeComponent(id)}');
    return CatalogProductDetails.fromJson(json, imageBase: _api.baseUrl);
  }

  Product? _summaryToProduct(Map<String, dynamic> json) {
    final price = _integer(json['price']);
    final name = _string(json['name']);
    if (price == null || price < 0 || name == null || name.isEmpty) return null;
    final comparePrice = _integer(json['comparePrice']);
    return Product(
      id: _string(json['id']),
      name: name,
      price: price,
      comparePrice: comparePrice != null && comparePrice >= price ? comparePrice : price,
      brandName: _string(json['brandName']),
      productType: _productType(_string(json['productType'])),
      platforms: _stringList(json['platforms']),
      imageUrl: _firstImage(json['imageUrls'], _api.baseUrl),
      rating: null,
    );
  }
}

class CatalogProductPage {
  const CatalogProductPage({required this.products, required this.page, required this.totalPages});

  final List<Product> products;
  final int page;
  final int totalPages;
}

class CatalogProductDetails {
  const CatalogProductDetails({
    required this.id,
    required this.name,
    required this.productType,
    required this.variants,
    this.brandName,
    this.description,
    this.platforms,
    this.publisher,
    this.genre,
    this.ageRating,
    this.releaseDate,
    this.connectionType,
    this.warrantyMonths,
    this.originCountry,
    this.imageUrl,
  });

  final String id;
  final String name;
  final String? brandName;
  final ProductType productType;
  final List<String>? platforms;
  final String? description;
  final String? publisher;
  final String? genre;
  final String? ageRating;
  final String? releaseDate;
  final ConnectionType? connectionType;
  final int? warrantyMonths;
  final String? originCountry;
  final String? imageUrl;
  final List<CatalogProductVariant> variants;

  factory CatalogProductDetails.fromJson(Map<String, dynamic> json, {required String imageBase}) {
    final rawVariants = json['variants'];
    final variants = rawVariants is List
        ? rawVariants
            .map((value) => CatalogProductVariant.fromJson(_asMap(value), imageBase: imageBase))
            .where((variant) => variant.id.isNotEmpty && variant.price >= 0)
            .toList()
        : <CatalogProductVariant>[];
    return CatalogProductDetails(
      id: _string(json['id']) ?? '',
      name: _string(json['name']) ?? '',
      brandName: _string(json['brandName']),
      productType: _productType(_string(json['productType'])),
      description: _string(json['description']),
      platforms: _stringList(json['platforms']),
      publisher: _string(json['publisher']),
      genre: _string(json['genre']),
      ageRating: _string(json['ageRating']),
      releaseDate: _string(json['releaseDate']),
      connectionType: _connectionType(_string(json['connectionType'])),
      warrantyMonths: _integer(json['warrantyMonths']),
      originCountry: _string(json['originCountry']),
      imageUrl: _resolveImage(_firstImage(json['imageUrls'], imageBase), imageBase),
      variants: variants,
    );
  }

  Product toProduct(CatalogProductVariant variant) => Product(
        id: id,
        variantId: variant.id,
        sku: variant.sku,
        name: name,
        price: variant.price,
        comparePrice: variant.comparePrice >= variant.price ? variant.comparePrice : variant.price,
        brandName: brandName,
        productType: productType,
        platforms: platforms,
        publisher: publisher,
        genre: genre,
        ageRating: ageRating,
        releaseDate: releaseDate,
        connectionType: connectionType,
        warrantyMonths: warrantyMonths,
        originCountry: originCountry,
        description: description,
        imageUrl: variant.imageUrl ?? imageUrl,
        availableQuantity: variant.availableQuantity,
      );
}

class CatalogProductVariant {
  const CatalogProductVariant({
    required this.id,
    required this.sku,
    required this.price,
    required this.comparePrice,
    required this.availableQuantity,
    this.imageUrl,
    this.attributes = const {},
  });

  final String id;
  final String sku;
  final int price;
  final int comparePrice;
  final int availableQuantity;
  final String? imageUrl;
  final Map<String, dynamic> attributes;

  factory CatalogProductVariant.fromJson(Map<String, dynamic> json, {required String imageBase}) {
    final price = _integer(json['price']) ?? 0;
    final comparePrice = _integer(json['comparePrice']) ?? price;
    final rawAttributes = json['attributes'];
    return CatalogProductVariant(
      id: _string(json['id']) ?? '',
      sku: _string(json['sku']) ?? '',
      price: price,
      comparePrice: comparePrice,
      availableQuantity: (_integer(json['availableQuantity']) ?? 0).clamp(0, 0x7fffffff).toInt(),
      imageUrl: _resolveImage(_string(json['imageUrl']), imageBase),
      attributes: rawAttributes is Map ? Map<String, dynamic>.from(rawAttributes) : const {},
    );
  }
}

Map<String, dynamic> _asMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  throw const FormatException('Expected an object in catalog response.');
}

String? _string(dynamic value) => value is String && value.trim().isNotEmpty ? value.trim() : null;

int? _integer(dynamic value) {
  if (value is num) return value.round();
  return value is String ? int.tryParse(value) : null;
}

List<String>? _stringList(dynamic value) {
  if (value is List) return value.whereType<String>().map((item) => item.trim()).where((item) => item.isNotEmpty).toList();
  if (value is String && value.trim().isNotEmpty) return value.split(',').map((item) => item.trim()).where((item) => item.isNotEmpty).toList();
  return null;
}

String? _firstImage(dynamic value, String base) {
  if (value is List) {
    for (final image in value) {
      final candidate = _resolveImage(_string(image), base);
      if (candidate != null) return candidate;
    }
  }
  return null;
}

String? _resolveImage(String? image, String base) {
  if (image == null) return null;
  final uri = Uri.tryParse(image);
  if (uri == null) return null;
  if (uri.hasScheme) return image;
  return Uri.parse(base).resolveUri(uri).toString();
}

ProductType _productType(String? value) => switch (value?.toLowerCase()) {
      'game_disc' => ProductType.gameDisc,
      'controller' => ProductType.controller,
      _ => ProductType.accessory,
    };

ConnectionType? _connectionType(String? value) => switch (value?.toLowerCase()) {
      'wired' => ConnectionType.wired,
      'wireless' => ConnectionType.wireless,
      'bluetooth' => ConnectionType.bluetooth,
      _ => null,
    };

IconData _categoryIcon(String name) {
  final normalized = name.toLowerCase();
  if (normalized.contains('tay cầm') || normalized.contains('controller')) return Icons.sports_esports_outlined;
  if (normalized.contains('đĩa') || normalized.contains('game')) return Icons.album_outlined;
  if (normalized.contains('tai nghe') || normalized.contains('headset')) return Icons.headset_outlined;
  if (normalized.contains('phụ kiện') || normalized.contains('accessory')) return Icons.cable_outlined;
  return Icons.category_outlined;
}
