import 'api_client.dart';

/// KAN-280: shipping addresses, needed because checkout (`POST /orders`)
/// requires a real `addressId` — mirrors web/src/pages/ProfilePage.tsx's
/// address management, scoped down to list + create.
class AddressService {
  AddressService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  Future<List<Address>> fetchAddresses({required String token}) async {
    final json = await _api.getList('/addresses', token: token);
    return json.map((value) => Address.fromJson(value as Map<String, dynamic>)).toList();
  }

  Future<Address> createAddress({
    required String recipientName,
    required String phone,
    required String fullAddress,
    bool isDefault = false,
    required String token,
  }) async {
    final json = await _api.post('/addresses', {
      'recipientName': recipientName,
      'phone': phone,
      'fullAddress': fullAddress,
      'isDefault': isDefault,
    }, token: token);
    return Address.fromJson(json);
  }
}

class Address {
  const Address({
    required this.id,
    required this.recipientName,
    required this.phone,
    required this.fullAddress,
    required this.isDefault,
  });

  final String id;
  final String recipientName;
  final String phone;
  final String fullAddress;
  final bool isDefault;

  factory Address.fromJson(Map<String, dynamic> json) => Address(
        id: json['id'] as String? ?? '',
        recipientName: json['recipientName'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        fullAddress: json['fullAddress'] as String? ?? '',
        isDefault: json['isDefault'] as bool? ?? false,
      );
}
