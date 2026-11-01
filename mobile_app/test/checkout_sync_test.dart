// POST /orders builds the order from the buyer's server cart, so checkout first makes that cart match the phone:
// lines being bought are selected with the phone's quantities, lines added on the web are only deselected.

import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:cho_tot_mua/services/api_client.dart';
import 'package:cho_tot_mua/services/order_service.dart';

void main() {
  test('checkout syncs the server cart to the phone cart before placing the order', () async {
    final calls = <String>[];
    final client = MockClient((request) async {
      final body = request.body.isEmpty ? '' : ' ${request.body}';
      calls.add('${request.method} ${request.url.path}$body');
      if (request.method == 'GET' && request.url.path == '/cart-items') {
        return http.Response(jsonEncode([
          {'id': 'web-line', 'variantId': 'web-variant', 'quantity': 1, 'isSelected': true},        // only on the web
          {'id': 'shared-line', 'variantId': 'variant-a', 'quantity': 5, 'isSelected': false},      // on both
        ]), 200, headers: {'content-type': 'application/json'});
      }
      if (request.url.path == '/orders') {
        return http.Response(jsonEncode({'id': 'order-1', 'status': 'pending', 'items': [], 'statusHistory': []}), 201,
            headers: {'content-type': 'application/json'});
      }
      return http.Response('{}', 200, headers: {'content-type': 'application/json'});
    });
    final service = OrderService(api: ApiClient(client: client, baseUrl: 'http://api.test'));

    await service.checkout(addressId: 'addr-1', quantitiesByVariant: {'variant-a': 2, 'variant-b': 1}, token: 't');

    expect(calls, [
      'GET /cart-items',
      'PATCH /cart-items/web-line/selection {"isSelected":false}',
      'PATCH /cart-items/shared-line {"quantity":2}',
      'PATCH /cart-items/shared-line/selection {"isSelected":true}',
      'POST /cart-items {"variantId":"variant-b","quantity":1}',
      'POST /orders {"addressId":"addr-1","paymentMethod":"cod"}',
    ]);
    expect(calls.where((c) => c.startsWith('DELETE')), isEmpty); // the web cart is never deleted
  });
}
