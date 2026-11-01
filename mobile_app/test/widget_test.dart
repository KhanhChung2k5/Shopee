// Home screen shows only real data: catalog, running flash sale and products from the API — and an honest
// error (no sample products) when the API cannot be reached.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cho_tot_mua/screens/home_screen.dart';
import 'package:cho_tot_mua/services/catalog_service.dart';
import 'package:cho_tot_mua/services/marketing_service.dart';
import 'package:cho_tot_mua/state/auth_scope.dart';
import 'package:cho_tot_mua/state/auth_state.dart';
import 'package:cho_tot_mua/state/cart_scope.dart';
import 'package:cho_tot_mua/state/cart_state.dart';

import 'fake_api.dart';

Widget homeWith({bool offline = false, bool withFlashSale = true, CartState? cart}) {
  final api = fakeApi(offline: offline, withFlashSale: withFlashSale);
  return AuthScope(
    auth: AuthState(),
    child: CartScope(
      cart: cart ?? CartState(),
      child: MaterialApp(
        home: HomeScreen(catalogService: CatalogService(api: api), marketingService: MarketingService(api: api)),
      ),
    ),
  );
}

void main() {
  testWidgets('Home screen renders the real catalog, flash sale and suggestions', (tester) async {
    tester.view.physicalSize = const Size(800, 3200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(homeWith());
    await tester.pumpAndSettle(const Duration(milliseconds: 100), EnginePhase.sendSemanticsUpdate, const Duration(seconds: 2));

    expect(find.text('Danh mục nổi bật'), findsOneWidget);
    expect(find.text(fakeCategoryName), findsOneWidget);
    expect(find.text('Flash Sale'), findsOneWidget);
    expect(find.text('Gợi ý hôm nay'), findsOneWidget);
    expect(find.text(fakeProductName), findsWidgets);
  });

  testWidgets('No flash sale running: the flash sale block is not shown', (tester) async {
    tester.view.physicalSize = const Size(800, 3200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(homeWith(withFlashSale: false));
    await tester.pumpAndSettle(const Duration(milliseconds: 100), EnginePhase.sendSemanticsUpdate, const Duration(seconds: 2));

    expect(find.text('Flash Sale'), findsNothing);
    expect(find.text('Gợi ý hôm nay'), findsOneWidget);
  });

  testWidgets('Offline: says it could not load, offers a retry, never shows sample products', (tester) async {
    tester.view.physicalSize = const Size(800, 3200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(homeWith(offline: true));
    await tester.pumpAndSettle(const Duration(milliseconds: 100), EnginePhase.sendSemanticsUpdate, const Duration(seconds: 2));

    expect(find.text('Không tải được sản phẩm.'), findsOneWidget);
    expect(find.text('Không tải được danh mục.'), findsOneWidget);
    expect(find.text('Thử lại'), findsNWidgets(2));
    expect(find.text('Đĩa game đua xe tốc độ cao - bản Standard'), findsNothing); // an old sample product
    expect(find.text('Flash Sale'), findsNothing);
  });
}
