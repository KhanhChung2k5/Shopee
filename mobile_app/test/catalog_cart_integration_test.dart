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
      }), 200, headers: {'content-type': 'application/json; charset=utf-8'});
    });
    // The product image is a full-width square (AspectRatio 1:1), which alone
    // exceeds the default 600px-tall test surface — without a taller surface,
    // ListView's sliver never builds the content below the image, and every
    // find.text() below it silently returns zero results.
    tester.view.physicalSize = const Size(800, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

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
