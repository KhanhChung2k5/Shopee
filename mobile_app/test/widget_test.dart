// Smoke test: the home screen renders its main sections as the user scrolls.

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cho_tot_mua/main.dart';

void main() {
  testWidgets('Home screen renders key sections', (WidgetTester tester) async {
    await tester.pumpWidget(const ChoTotMuaApp());
    await tester.pump(const Duration(milliseconds: 100));

    final scrollView = find.byKey(const Key('home-scroll-view'));

    Future<void> scrollBy(double offset) async {
      await tester.drag(scrollView, Offset(0, -offset));
      await tester.pump(const Duration(milliseconds: 100));
    }

    await scrollBy(400);
    expect(find.text('Danh mục nổi bật'), findsOneWidget);

    await scrollBy(700);
    expect(find.text('Flash Sale'), findsOneWidget);

    await scrollBy(700);
    expect(find.text('Gợi ý hôm nay'), findsOneWidget);
  });
}
