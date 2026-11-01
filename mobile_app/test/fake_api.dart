// A fake backend for widget tests: the same JSON shapes the real API returns, so screens render real-looking
// data without a network (the app no longer falls back to built-in sample products).

import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:cho_tot_mua/services/api_client.dart';

const fakeProductName = 'Tay cầm DualSense Midnight Black';
const fakeCategoryName = 'Tay cầm PS5';

http.Response _json(Object body, [int status = 200]) =>
    http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json; charset=utf-8'});

final _product = {
  'id': 'product-1',
  'name': fakeProductName,
  'price': 1990000,
  'comparePrice': 2299000,
  'productType': 'controller',
  'platforms': ['PS5'],
  'imageUrls': <String>[],
};

/// [offline]: every request fails, like a phone without a connection.
ApiClient fakeApi({bool offline = false, bool withFlashSale = true}) {
  final client = MockClient((request) async {
    if (offline) return _json({'message': 'offline'}, 503);
    final path = request.url.path;
    if (path == '/api/catalog/categories') {
      return _json([
        {'id': 'cat-1', 'name': fakeCategoryName, 'slug': 'tay-cam-ps5'},
      ]);
    }
    if (path == '/api/products') {
      return _json({'content': [_product], 'page': 0, 'totalPages': 1});
    }
    if (path == '/api/products/product-1') {
      return _json({
        ..._product,
        'description': 'Tay cầm PS5',
        'variants': [
          {'id': 'variant-1', 'sku': 'DS-BLACK', 'price': 1990000, 'comparePrice': 2299000, 'availableQuantity': 5},
        ],
      });
    }
    if (path == '/flash-sales') {
      return _json(withFlashSale
          ? [
              {
                'variantId': 'variant-1',
                'productName': fakeProductName,
                'originalPrice': 2299000,
                'flashPrice': 1790000,
                'soldQty': 1,
                'limitQty': 5,
                'endsAt': DateTime.now().add(const Duration(hours: 2)).toUtc().toIso8601String(),
              },
            ]
          : []);
    }
    return _json({'message': 'not found'}, 404);
  });
  return ApiClient(client: client, baseUrl: 'http://api.test');
}
