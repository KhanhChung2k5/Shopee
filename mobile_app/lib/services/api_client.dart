import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Android emulator can't reach the host via "localhost" — it must use the
/// special alias 10.0.2.2. iOS simulator and web/desktop all share the host
/// network, so "localhost" works there.
String get _defaultHost {
  if (!kIsWeb && Platform.isAndroid) return '10.0.2.2';
  return 'localhost';
}

final String apiBaseUrl = 'http://$_defaultHost:8080';

class ApiException implements Exception {
  ApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  @override
  String toString() => message;
}

/// Thin JSON wrapper around `package:http`, mirroring the web app's
/// `apiFetch` helper (web/src/lib/api.ts): optional Bearer token in,
/// throws [ApiException] with the backend's own message on non-2xx.
class ApiClient {
  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body, {String? token}) {
    return _send('POST', path, body: body, token: token);
  }

  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body, {String? token}) {
    return _send('PATCH', path, body: body, token: token);
  }

  Future<Map<String, dynamic>> get(String path, {String? token}) {
    return _send('GET', path, token: token);
  }

  Future<Map<String, dynamic>> _send(String method, String path, {Map<String, dynamic>? body, String? token}) async {
    final uri = Uri.parse('$apiBaseUrl$path');
    final headers = <String, String>{
      if (body != null) 'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    final encodedBody = body == null ? null : jsonEncode(body);

    final http.Response response;
    switch (method) {
      case 'POST':
        response = await http.post(uri, headers: headers, body: encodedBody);
      case 'PATCH':
        response = await http.patch(uri, headers: headers, body: encodedBody);
      default:
        response = await http.get(uri, headers: headers);
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {};
      return jsonDecode(response.body) as Map<String, dynamic>;
    }

    String message = 'Lỗi ${response.statusCode}';
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map && decoded['message'] != null) message = decoded['message'] as String;
    } catch (_) {
      // response wasn't JSON — keep the generic message
    }
    throw ApiException(response.statusCode, message);
  }
}
