// Verifies the screens that were previously unreachable (bottom-nav tabs,
// product detail, category drill-down, add-to-cart) actually navigate.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cho_tot_mua/main.dart';

void main() {
  testWidgets('Bottom nav switches to Cart tab and shows empty state', (tester) async {
    await tester.pumpWidget(const ChoTotMuaApp());
    await tester.pump(const Duration(milliseconds: 100));

    await tester.tap(find.text('Giỏ hàng').first);
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Giỏ hàng của bạn đang trống'), findsOneWidget);
  });

  testWidgets('Tapping a category opens its product list screen', (tester) async {
    await tester.pumpWidget(const ChoTotMuaApp());
    await tester.pump(const Duration(milliseconds: 100));

    await tester.drag(find.byKey(const Key('home-scroll-view')), const Offset(0, -400));
    await tester.pump(const Duration(milliseconds: 100));

    await tester.tap(find.text('Tay cầm PS5').first);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.widgetWithText(AppBar, 'Tay cầm PS5'), findsOneWidget);
  });

  testWidgets('Tapping a product opens detail screen and Add to cart updates cart badge', (tester) async {
    await tester.pumpWidget(const ChoTotMuaApp());
    await tester.pump(const Duration(milliseconds: 100));

    // Scroll to the "Gợi ý hôm nay" grid and tap the first product card.
    await tester.drag(find.byKey(const Key('home-scroll-view')), const Offset(0, -1800));
    await tester.pump(const Duration(milliseconds: 100));

    await tester.tap(find.text('Đĩa game đua xe tốc độ cao - bản Standard').first);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.widgetWithText(AppBar, 'Chi tiết sản phẩm'), findsOneWidget);
    expect(find.text('Thêm vào giỏ'), findsOneWidget);

    await tester.tap(find.text('Thêm vào giỏ'));
    await tester.pump(const Duration(milliseconds: 100));

    // Back to Home, then switch to Cart tab and confirm the item is there.
    await tester.pageBack();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    await tester.tap(find.text('Giỏ hàng').first);
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Đĩa game đua xe tốc độ cao - bản Standard'), findsOneWidget);
  });
}
