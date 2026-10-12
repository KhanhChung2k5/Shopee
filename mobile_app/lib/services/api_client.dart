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

final String apiBaseUrl = const String.fromEnvironment('API_BASE_URL').isNotEmpty
    ? const String.fromEnvironment('API_BASE_URL')
    : 'http://$_defaultHost:8080';
final http.Client _sharedHttpClient = http.Client();

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
  ApiClient({http.Client? client, String? baseUrl})
      : _client = client ?? _sharedHttpClient,
        _baseUrl = (baseUrl ?? apiBaseUrl).replaceFirst(RegExp(r'/$'), '');

  final http.Client _client;
  final String _baseUrl;
  String get baseUrl => _baseUrl;

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body, {String? token}) {
    return _send('POST', path, body: body, token: token);
  }

  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body, {String? token}) {
    return _send('PATCH', path, body: body, token: token);
  }

  Future<Map<String, dynamic>> get(String path, {String? token}) {
    return _send('GET', path, token: token);
  }

  Future<List<dynamic>> getList(String path, {String? token}) async {
    final response = await _request('GET', path, token: token);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return const [];
      final decoded = jsonDecode(response.body);
      if (decoded is List) return decoded;
      throw const FormatException('Expected a JSON array response.');
    }
    throw _exceptionFor(response);
  }

  Future<Map<String, dynamic>> _send(String method, String path, {Map<String, dynamic>? body, String? token}) async {
    final response = await _request(method, path, body: body, token: token);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {};
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) return decoded;
      throw const FormatException('Expected a JSON object response.');
    }
    throw _exceptionFor(response);
  }

  Future<http.Response> _request(String method, String path,
      {Map<String, dynamic>? body, String? token}) async {
    final uri = Uri.parse('$_baseUrl$path');
    final headers = <String, String>{
      if (body != null) 'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    final encodedBody = body == null ? null : jsonEncode(body);
    final request = http.Request(method, uri)..headers.addAll(headers);
    if (encodedBody != null) request.body = encodedBody;
    final streamedResponse = await _client.send(request);
    return http.Response.fromStream(streamedResponse);
  }

  ApiException _exceptionFor(http.Response response) {
    String message = 'Lỗi ${response.statusCode}';
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map && decoded['message'] != null) message = decoded['message'].toString();
    } catch (_) {
      // response wasn't JSON — keep the generic message
    }
    return ApiException(response.statusCode, message);
  }
}
