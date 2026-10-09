import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:cho_tot_mua/models/product.dart';
import 'package:cho_tot_mua/screens/product_detail_screen.dart';
import 'package:cho_tot_mua/services/api_client.dart';
import 'package:cho_tot_mua/services/catalog_service.dart';
import 'package:cho_tot_mua/state/cart_scope.dart';
import 'package:cho_tot_mua/state/cart_state.dart';

void main() {
  testWidgets('real catalog variant is added to cart with its exact price and stock limit', (tester) async {
    final client = MockClient((request) async {
      expect(request.url.path, '/api/products/product-1');
      return http.Response(jsonEncode({
        'id': 'product-1',
        'name': 'Tay cầm DualSense',
        'description': 'Tay cầm PS5',
        'productType': 'controller',
        'platforms': ['PS5'],
        'variants': [
          {
            'id': 'variant-1',
            'sku': 'DS-BLACK',
            'price': 1990000,
            'comparePrice': 2299000,
            'availableQuantity': 2,
          },
        ],
      }), 200);
    });
    final service = CatalogService(api: ApiClient(client: client, baseUrl: 'http://catalog.test'));
    final cart = CartState();
    const summary = Product(
      id: 'product-1',
      name: 'Tay cầm DualSense',
      price: 1990000,
      comparePrice: 2299000,
      productType: ProductType.controller,
    );

    await tester.pumpWidget(CartScope(
      cart: cart,
      child: MaterialApp(home: ProductDetailScreen(product: summary, catalogService: service)),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Còn 2 sản phẩm'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.add_rounded));
    await tester.pump();
    await tester.tap(find.text('Thêm vào giỏ'));
    await tester.pump();

    expect(cart.lines, hasLength(1));
    expect(cart.lines.single.product.variantId, 'variant-1');
    expect(cart.lines.single.product.price, 1990000);
    expect(cart.lines.single.product.availableQuantity, 2);
    expect(cart.lines.single.quantity, 2);
    expect(cart.subtotal, 3980000);

    cart.dispose();
    client.close();
  });
}
