// Verifies the screens that were previously unreachable (bottom-nav tabs,
// product detail, category drill-down, add-to-cart) actually navigate.
// Catalog screens are driven by a fake API (test/fake_api.dart) — the app has no built-in sample data any more.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cho_tot_mua/main.dart';
import 'package:cho_tot_mua/state/cart_state.dart';

import 'fake_api.dart';
import 'widget_test.dart' show homeWith;

void main() {
  testWidgets('Bottom nav switches to Cart tab and shows empty state', (tester) async {
    await tester.pumpWidget(const ChoTotMuaApp());
    await tester.pump(const Duration(milliseconds: 100));

    await tester.tap(find.text('Giỏ hàng').first);
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Giỏ hàng của bạn đang trống'), findsOneWidget);
  });

  testWidgets('Tapping a category opens its product list screen', (tester) async {
    tester.view.physicalSize = const Size(800, 3200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(homeWith());
    await tester.pumpAndSettle(const Duration(milliseconds: 100), EnginePhase.sendSemanticsUpdate, const Duration(seconds: 2));

    await tester.tap(find.text(fakeCategoryName).first);
    await tester.pumpAndSettle(const Duration(milliseconds: 100), EnginePhase.sendSemanticsUpdate, const Duration(seconds: 2));

    expect(find.widgetWithText(AppBar, fakeCategoryName), findsOneWidget);
    expect(find.text(fakeProductName), findsWidgets);
  });

  testWidgets('Tapping a product opens detail screen and Add to cart puts the real variant in the cart', (tester) async {
    tester.view.physicalSize = const Size(800, 3200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final cart = CartState();

    await tester.pumpWidget(homeWith(withFlashSale: false, cart: cart));
    await tester.pumpAndSettle(const Duration(milliseconds: 100), EnginePhase.sendSemanticsUpdate, const Duration(seconds: 2));

    await tester.tap(find.text(fakeProductName).first);
    await tester.pumpAndSettle(const Duration(milliseconds: 100), EnginePhase.sendSemanticsUpdate, const Duration(seconds: 2));

    expect(find.widgetWithText(AppBar, 'Chi tiết sản phẩm'), findsOneWidget);
    await tester.tap(find.text('Thêm vào giỏ'));
    await tester.pump(const Duration(milliseconds: 100));

    expect(cart.lines, hasLength(1));
    expect(cart.lines.single.product.variantId, 'variant-1'); // orderable: checkout needs a real variant
  });
}
