import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:cho_tot_mua/services/api_client.dart';
import 'package:cho_tot_mua/services/catalog_service.dart';
import 'package:cho_tot_mua/models/product.dart';

void main() {
  test('fetchCategories parses live category IDs and labels', () async {
    final client = MockClient((request) async {
      expect(request.url.path, '/api/catalog/categories');
      return http.Response(jsonEncode([
        {'id': 'category-1', 'name': 'Tay cầm', 'slug': 'tay-cam', 'parentId': null},
      ]), 200);
    });
    final service = CatalogService(api: ApiClient(client: client, baseUrl: 'http://catalog.test'));

    final categories = await service.fetchCategories();

    expect(categories, hasLength(1));
    expect(categories.single.id, 'category-1');
    expect(categories.single.label, 'Tay cầm');
    client.close();
  });

  test('fetchProducts uses the real category API and maps catalog prices and images', () async {
    final client = MockClient((request) async {
      expect(request.url.path, '/api/products');
      expect(request.url.queryParameters, {'categoryId': 'category-1', 'page': '0', 'size': '20'});
      return http.Response(jsonEncode({
        'content': [
          {
            'id': 'product-1',
            'name': 'DualSense',
            'productType': 'controller',
            'platforms': ['PS5'],
            'imageUrls': ['/uploads/dualsense.png'],
            'price': 1990000,
            'comparePrice': 2299000,
          },
        ],
        'page': 0,
        'size': 20,
        'totalElements': 1,
        'totalPages': 1,
      }), 200);
    });
    final service = CatalogService(api: ApiClient(client: client, baseUrl: 'http://catalog.test'));

    final result = await service.fetchProducts(categoryId: 'category-1', page: 0, size: 20);

    expect(result.products, hasLength(1));
    expect(result.products.single.id, 'product-1');
    expect(result.products.single.productType, ProductType.controller);
    expect(result.products.single.price, 1990000);
    expect(result.products.single.comparePrice, 2299000);
    expect(result.products.single.imageUrl, 'http://catalog.test/uploads/dualsense.png');
    client.close();
  });

  test('detail response keeps each variant price and available stock separate', () async {
    final client = MockClient((request) async => http.Response(jsonEncode({
          'id': 'product-1',
          'name': 'DualSense',
          'productType': 'controller',
          'platforms': ['PS5'],
          'variants': [
            {'id': 'variant-a', 'sku': 'BLACK', 'price': 1800000, 'comparePrice': 2000000, 'availableQuantity': 5},
            {'id': 'variant-b', 'sku': 'PURPLE', 'price': 2100000, 'comparePrice': 2300000, 'availableQuantity': 2},
          ],
        }), 200));
    final service = CatalogService(api: ApiClient(client: client, baseUrl: 'http://catalog.test'));

    final details = await service.fetchProduct('product-1');
    final black = details.toProduct(details.variants[0]);
    final purple = details.toProduct(details.variants[1]);

    expect(black.price, 1800000);
    expect(black.availableQuantity, 5);
    expect(black.variantId, 'variant-a');
    expect(purple.price, 2100000);
    expect(purple.availableQuantity, 2);
    expect(purple.variantId, 'variant-b');
    client.close();
  });
}
