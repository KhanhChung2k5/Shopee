import 'api_client.dart';

/// KAN-280: real Order API client — mirrors the web app's OrderDetailPage /
/// OrderHistoryPage contract (web/src/pages/OrderDetailPage.tsx), reading
/// from the same backend endpoints (`/orders`, `/orders/{id}`, `/orders/{id}/status`).
class OrderService {
  OrderService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  Future<OrderDetail> checkout({
    required String addressId,
    String? voucherCode,
    String paymentMethod = 'cod',
    required String token,
  }) async {
    final body = <String, dynamic>{'addressId': addressId, 'paymentMethod': paymentMethod};
    if (voucherCode != null && voucherCode.trim().isNotEmpty) body['voucherCode'] = voucherCode.trim();
    final json = await _api.post('/orders', body, token: token);
    return OrderDetail.fromJson(json);
  }

  Future<List<OrderSummary>> fetchOrders({String? status, required String token}) async {
    final query = status == null || status == 'all' ? '' : '?status=$status';
    final json = await _api.getList('/orders$query', token: token);
    return json.map((value) => OrderSummary.fromJson(_asMap(value))).toList();
  }

  Future<OrderDetail> fetchOrder(String id, {required String token}) async {
    final json = await _api.get('/orders/$id', token: token);
    return OrderDetail.fromJson(json);
  }

  /// Buyers may only request cancellation (status=cancel_requested); the
  /// backend enforces that server-side regardless of what's sent here.
  Future<void> requestCancel(String orderId, String reason, {required String token}) async {
    await _api.patch('/orders/$orderId/status', {
      'status': 'cancel_requested',
      'reason': reason,
    }, token: token);
  }

  Map<String, dynamic> _asMap(dynamic value) => value is Map<String, dynamic> ? value : <String, dynamic>{};
}

class OrderSummary {
  const OrderSummary({
    required this.id,
    required this.totalAmount,
    required this.status,
    required this.shipmentStatus,
    required this.itemCount,
    this.createdAt,
  });

  final String id;
  final num totalAmount;
  final String status;
  final String shipmentStatus;
  final int itemCount;
  final DateTime? createdAt;

  factory OrderSummary.fromJson(Map<String, dynamic> json) => OrderSummary(
        id: json['id'] as String? ?? '',
        totalAmount: (json['totalAmount'] as num?) ?? 0,
        status: json['status'] as String? ?? 'pending',
        shipmentStatus: json['shipmentStatus'] as String? ?? 'pending',
        itemCount: (json['itemCount'] as num?)?.toInt() ?? 0,
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      );
}

class OrderItemDetail {
  const OrderItemDetail({
    required this.id,
    required this.variantId,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
    required this.productName,
  });

  final String id;
  final String variantId;
  final int quantity;
  final num unitPrice;
  final num lineTotal;
  final String productName;

  factory OrderItemDetail.fromJson(Map<String, dynamic> json) => OrderItemDetail(
        id: json['id'] as String? ?? '',
        variantId: json['variantId'] as String? ?? '',
        quantity: (json['quantity'] as num?)?.toInt() ?? 0,
        unitPrice: (json['unitPrice'] as num?) ?? 0,
        lineTotal: (json['lineTotal'] as num?) ?? 0,
        productName: json['productNameSnapshot'] as String? ?? 'Sản phẩm',
      );
}

class OrderStatusHistoryEntry {
  const OrderStatusHistoryEntry({required this.status, required this.changedByType, this.reason, this.changedAt});

  final String status;
  final String changedByType;
  final String? reason;
  final DateTime? changedAt;

  factory OrderStatusHistoryEntry.fromJson(Map<String, dynamic> json) => OrderStatusHistoryEntry(
        status: json['status'] as String? ?? '',
        changedByType: json['changedByType'] as String? ?? 'system',
        reason: json['reason'] as String?,
        changedAt: DateTime.tryParse(json['changedAt'] as String? ?? ''),
      );
}

/// Shape returned by both POST /orders (checkout) and GET /orders/{id} — the
/// checkout response simply omits warehouseId/trackingNo/statusHistory,
/// which stay null/empty here until the order progresses.
class OrderDetail {
  const OrderDetail({
    required this.id,
    required this.shippingAddressSnapshot,
    required this.subtotalAmount,
    required this.discountAmount,
    required this.shippingFeeAmount,
    required this.totalAmount,
    required this.status,
    required this.shipmentStatus,
    required this.items,
    required this.statusHistory,
    this.shippingProviderName,
    this.trackingNo,
    this.createdAt,
  });

  final String id;
  final String shippingAddressSnapshot;
  final num subtotalAmount;
  final num discountAmount;
  final num shippingFeeAmount;
  final num totalAmount;
  final String status;
  final String shipmentStatus;
  final String? shippingProviderName;
  final String? trackingNo;
  final DateTime? createdAt;
  final List<OrderItemDetail> items;
  final List<OrderStatusHistoryEntry> statusHistory;

  factory OrderDetail.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    final rawHistory = json['statusHistory'];
    return OrderDetail(
      id: json['id'] as String? ?? '',
      shippingAddressSnapshot: json['shippingAddressSnapshot'] as String? ?? '',
      subtotalAmount: (json['subtotalAmount'] as num?) ?? 0,
      discountAmount: (json['discountAmount'] as num?) ?? 0,
      shippingFeeAmount: (json['shippingFeeAmount'] as num?) ?? 0,
      totalAmount: (json['totalAmount'] as num?) ?? 0,
      status: json['status'] as String? ?? 'pending',
      shipmentStatus: json['shipmentStatus'] as String? ?? 'pending',
      shippingProviderName: json['shippingProviderName'] as String?,
      trackingNo: json['trackingNo'] as String?,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      items: rawItems is List
          ? rawItems.map((value) => OrderItemDetail.fromJson(value as Map<String, dynamic>)).toList()
          : const [],
      statusHistory: rawHistory is List
          ? rawHistory.map((value) => OrderStatusHistoryEntry.fromJson(value as Map<String, dynamic>)).toList()
          : const [],
    );
  }
}
