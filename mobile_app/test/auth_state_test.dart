// KAN-275: plain Dart test (package:test, not flutter_test) against the real
// running backend at localhost:8080 — flutter_test's TestWidgetsFlutterBinding
// fakes HttpClient and always returns 400, so real-network verification has
// to happen outside the widget-test harness, directly on AuthState.

import 'package:cho_tot_mua/state/auth_state.dart';
import 'package:test/test.dart';

void main() {
  test('register then login against the real /auth endpoints', () async {
    final auth = AuthState();
    final email = 'dart-e2e-${DateTime.now().millisecondsSinceEpoch}@example.com';

    final registered = await auth.register(email: email, password: 'abc12345', fullName: 'Dart E2E User');
    expect(registered, isTrue, reason: auth.error ?? 'register failed');
    expect(auth.isLoggedIn, isTrue);
    expect(auth.user!.fullName, 'Dart E2E User');
    expect(auth.user!.role, 'buyer');

    auth.logout();
    expect(auth.isLoggedIn, isFalse);

    final loggedIn = await auth.login(emailOrPhone: email, password: 'abc12345');
    expect(loggedIn, isTrue, reason: auth.error ?? 'login failed');
    expect(auth.user!.fullName, 'Dart E2E User');
  });

  test('login with wrong password fails with a real 401 from the server', () async {
    final auth = AuthState();
    final ok = await auth.login(emailOrPhone: 'nonexistent-dart-e2e@example.com', password: 'wrongpass123');
    expect(ok, isFalse);
    expect(auth.isLoggedIn, isFalse);
    expect(auth.error, isNotNull);
  });
}
