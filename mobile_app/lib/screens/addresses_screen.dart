import 'package:flutter/material.dart';
import '../services/address_service.dart';
import '../services/api_client.dart';
import '../state/auth_scope.dart';
import '../theme/app_theme.dart';

/// KAN-280: real shipping-address list/create, backed by `/addresses`.
/// If [selectMode] is true, tapping an address pops it back to the caller
/// (used by the checkout flow); otherwise this is just the account-menu
/// "Địa chỉ giao hàng" screen.
class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key, this.selectMode = false});

  final bool selectMode;

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  final AddressService _service = AddressService();
  List<Address> _addresses = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final token = AuthScope.of(context).token;
    if (token == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final addresses = await _service.fetchAddresses(token: token);
      if (!mounted) return;
      setState(() {
        _addresses = addresses;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error is ApiException ? error.message : 'Không tải được danh sách địa chỉ';
      });
    }
  }

  Future<void> _addAddress() async {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final addressController = TextEditingController();
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Thêm địa chỉ mới', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 16),
            TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Họ tên người nhận')),
            const SizedBox(height: 10),
            TextField(controller: phoneController, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Số điện thoại')),
            const SizedBox(height: 10),
            TextField(controller: addressController, maxLines: 2, decoration: const InputDecoration(labelText: 'Địa chỉ đầy đủ')),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () {
                if (nameController.text.trim().isEmpty ||
                    phoneController.text.trim().isEmpty ||
                    addressController.text.trim().isEmpty) {
                  return;
                }
                Navigator.of(context).pop(true);
              },
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(46)),
              child: const Text('Lưu địa chỉ'),
            ),
          ],
        ),
      ),
    );
    if (saved != true) return;

    final token = AuthScope.of(context).token;
    if (token == null) return;
    try {
      final created = await _service.createAddress(
        recipientName: nameController.text.trim(),
        phone: phoneController.text.trim(),
        fullAddress: addressController.text.trim(),
        isDefault: _addresses.isEmpty,
        token: token,
      );
      if (!mounted) return;
      if (widget.selectMode) {
        Navigator.of(context).pop(created);
        return;
      }
      await _load();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(error is ApiException ? error.message : 'Không thể lưu địa chỉ'),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Địa chỉ giao hàng')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addAddress,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Thêm địa chỉ'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      OutlinedButton(onPressed: _load, child: const Text('Thử lại')),
                    ]),
                  ),
                )
              : _addresses.isEmpty
                  ? const Center(child: Text('Chưa có địa chỉ nào — bấm "Thêm địa chỉ" để tạo mới', textAlign: TextAlign.center, style: TextStyle(color: AppColors.mutedForeground)))
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                      itemCount: _addresses.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, i) {
                        final address = _addresses[i];
                        return InkWell(
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          onTap: widget.selectMode ? () => Navigator.of(context).pop(address) : null,
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(children: [
                                  Text(address.recipientName, style: const TextStyle(fontWeight: FontWeight.w700)),
                                  const SizedBox(width: 8),
                                  Text(address.phone, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12.5)),
                                  if (address.isDefault) ...[
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(999)),
                                      child: const Text('Mặc định', style: TextStyle(color: AppColors.primaryDark, fontSize: 10.5, fontWeight: FontWeight.w700)),
                                    ),
                                  ],
                                ]),
                                const SizedBox(height: 6),
                                Text(address.fullAddress, style: const TextStyle(fontSize: 13)),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
