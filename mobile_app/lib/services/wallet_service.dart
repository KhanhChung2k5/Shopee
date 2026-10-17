import 'dart:math';
import 'api_client.dart';

/// KAN-283: wallet balance/top-up, backed by the real `/wallet` endpoints.
class WalletService {
  WalletService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;
  static final Random _random = Random.secure();

  /// Minimal RFC 4122 v4 UUID generator — avoids pulling in the `uuid`
  /// package just for one random, backend-validated request id.
  static String _newUuidV4() {
    final bytes = List<int>.generate(16, (_) => _random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
    String hex(int start, int end) =>
        bytes.sublist(start, end).map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return '${hex(0, 4)}-${hex(4, 6)}-${hex(6, 8)}-${hex(8, 10)}-${hex(10, 16)}';
  }

  Future<num> fetchBalance({required String token}) async {
    final json = await _api.get('/wallet', token: token);
    return (json['balance'] as num?) ?? 0;
  }

  Future<List<WalletTransaction>> fetchTransactions({required String token}) async {
    final json = await _api.getList('/wallet/transactions', token: token);
    return json.map((value) => WalletTransaction.fromJson(value as Map<String, dynamic>)).toList();
  }

  /// requestId makes a top-up safely retryable (the backend dedupes on it);
  /// a fresh uuid per tap is correct since each tap is a distinct request.
  Future<num> topUp(num amount, {required String token}) async {
    final json = await _api.post('/wallet/topups', {
      'requestId': _newUuidV4(),
      'amount': amount,
    }, token: token);
    return (json['balance'] as num?) ?? 0;
  }
}

class WalletTransaction {
  const WalletTransaction({required this.type, required this.amount, this.createdAt});

  final String type;
  final num amount;
  final DateTime? createdAt;

  factory WalletTransaction.fromJson(Map<String, dynamic> json) => WalletTransaction(
        type: json['type'] as String? ?? '',
        amount: (json['amount'] as num?) ?? 0,
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      );
}
