// KAN-275: AuthState against the /auth endpoints, through a fake server that answers exactly like the
// backend (status codes and JSON). It used to call the real backend and left a new "dart-e2e-…" account in
// the shared database on every run; the HTTP contract is what this test checks, so a fake is enough.

import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:cho_tot_mua/services/api_client.dart';
import 'package:cho_tot_mua/state/auth_state.dart';
import 'package:test/test.dart';

/// Register/login like the backend: 201 + token on register, 200 on login, 401 with a message on a bad password.
ApiClient fakeAuthServer() {
  final accounts = <String, String>{};
  http.Response json(Object body, int status) =>
      http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json; charset=utf-8'});
  final client = MockClient((request) async {
    final body = request.body.isEmpty ? <String, dynamic>{} : jsonDecode(request.body) as Map<String, dynamic>;
    switch (request.url.path) {
      case '/auth/register':
        if (accounts.containsKey(body['email'])) return json({'message': 'Email đã được sử dụng'}, 409);
        accounts[body['email'] as String] = body['password'] as String;
        return json({'token': 'token-1', 'userId': 'user-1', 'role': 'buyer', 'fullName': body['fullName']}, 201);
      case '/auth/login':
        final known = accounts[body['emailOrPhone']];
        if (known == null || known != body['password']) {
          return json({'message': 'Email/số điện thoại hoặc mật khẩu không đúng'}, 401);
        }
        return json({'token': 'token-2', 'userId': 'user-1', 'role': 'buyer', 'fullName': 'Dart E2E User'}, 200);
    }
    return json({'message': 'not found'}, 404);
  });
  return ApiClient(client: client, baseUrl: 'http://api.test');
}

void main() {
  test('register then login against the /auth endpoints', () async {
    final auth = AuthState(api: fakeAuthServer());
    const email = 'dart-e2e@example.com';

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

  test('login with wrong password fails with the server\'s 401 message', () async {
    final auth = AuthState(api: fakeAuthServer());
    final ok = await auth.login(emailOrPhone: 'nonexistent-dart-e2e@example.com', password: 'wrongpass123');
    expect(ok, isFalse);
    expect(auth.isLoggedIn, isFalse);
    expect(auth.error, 'Email/số điện thoại hoặc mật khẩu không đúng');
  });
}
