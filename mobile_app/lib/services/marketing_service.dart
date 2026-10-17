import 'api_client.dart';

/// KAN-283: vouchers, flash sales, and loyalty — all small single-GET
/// endpoints under the backend's marketing module, grouped here together.
class MarketingService {
  MarketingService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  Future<List<AvailableVoucher>> fetchVouchers({required String token}) async {
    final json = await _api.getList('/vouchers', token: token);
    return json.map((value) => AvailableVoucher.fromJson(value as Map<String, dynamic>)).toList();
  }

  Future<List<FlashSaleDeal>> fetchFlashSales({String? token}) async {
    final json = await _api.getList('/flash-sales', token: token);
    return json.map((value) => FlashSaleDeal.fromJson(value as Map<String, dynamic>, imageBase: _api.baseUrl)).toList();
  }

  Future<LoyaltySummary> fetchLoyalty({required String token}) async {
    final json = await _api.get('/loyalty', token: token);
    return LoyaltySummary.fromJson(json);
  }
}

class AvailableVoucher {
  const AvailableVoucher({
    required this.code,
    required this.type,
    required this.value,
    required this.programName,
    this.endsAt,
  });

  final String code;
  final String type; // "fixed" | "percent"
  final num value;
  final String programName;
  final DateTime? endsAt;

  String get amountLabel => type == 'percent' ? 'Giảm ${value.toInt()}%' : 'Giảm ₫${_formatVnd(value)}';

  factory AvailableVoucher.fromJson(Map<String, dynamic> json) => AvailableVoucher(
        code: json['code'] as String? ?? '',
        type: json['type'] as String? ?? 'fixed',
        value: (json['value'] as num?) ?? 0,
        programName: json['programName'] as String? ?? 'Khuyến mãi',
        endsAt: DateTime.tryParse(json['endsAt'] as String? ?? ''),
      );
}

class FlashSaleDeal {
  const FlashSaleDeal({
    required this.variantId,
    required this.productName,
    required this.originalPrice,
    required this.flashPrice,
    required this.soldQty,
    required this.limitQty,
    this.imageUrl,
  });

  final String variantId;
  final String productName;
  final num originalPrice;
  final num flashPrice;
  final int soldQty;
  final int limitQty;
  final String? imageUrl;

  factory FlashSaleDeal.fromJson(Map<String, dynamic> json, {required String imageBase}) {
    final rawImage = json['imageUrl'] as String?;
    final resolvedImage = rawImage == null || rawImage.isEmpty
        ? null
        : (rawImage.startsWith('http') ? rawImage : '$imageBase$rawImage');
    return FlashSaleDeal(
      variantId: json['variantId'] as String? ?? '',
      productName: json['productName'] as String? ?? 'Sản phẩm',
      originalPrice: (json['originalPrice'] as num?) ?? 0,
      flashPrice: (json['flashPrice'] as num?) ?? 0,
      soldQty: (json['soldQty'] as num?)?.toInt() ?? 0,
      limitQty: (json['limitQty'] as num?)?.toInt() ?? 0,
      imageUrl: resolvedImage,
    );
  }
}

class LoyaltySummary {
  const LoyaltySummary({required this.balance, this.tier});

  final int balance;
  final String? tier;

  factory LoyaltySummary.fromJson(Map<String, dynamic> json) => LoyaltySummary(
        balance: (json['balance'] as num?)?.toInt() ?? 0,
        tier: json['tier'] as String?,
      );
}

String _formatVnd(num value) {
  final s = value.toInt().toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    final posFromEnd = s.length - i;
    buf.write(s[i]);
    if (posFromEnd > 1 && posFromEnd % 3 == 1) buf.write('.');
  }
  return buf.toString();
}
