import 'package:flutter/material.dart';
import '../models/product.dart';
import '../services/api_client.dart';
import '../services/marketing_service.dart';
import '../state/auth_scope.dart';
import '../theme/app_theme.dart';
import '../widgets/voucher_card.dart';

/// KAN-283: real voucher list, backed by GET /vouchers (was SampleData.vouchers before).
class VouchersScreen extends StatefulWidget {
  const VouchersScreen({super.key});

  @override
  State<VouchersScreen> createState() => _VouchersScreenState();
}

class _VouchersScreenState extends State<VouchersScreen> {
  final MarketingService _service = MarketingService();
  List<AvailableVoucher> _vouchers = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final token = AuthScope.of(context).token;
    if (token == null) {
      setState(() => _loading = false);
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final vouchers = await _service.fetchVouchers(token: token);
      if (!mounted) return;
      setState(() {
        _vouchers = vouchers;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error is ApiException ? error.message : 'Không tải được danh sách voucher';
      });
    }
  }

  VoucherOffer _toOffer(AvailableVoucher v) => VoucherOffer(
        amountLabel: v.amountLabel,
        conditionLabel: v.code,
        title: v.programName,
        expiryLabel: v.endsAt != null
            ? 'HSD: ${v.endsAt!.day.toString().padLeft(2, '0')}/${v.endsAt!.month.toString().padLeft(2, '0')}/${v.endsAt!.year}'
            : 'Không giới hạn',
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Voucher của tôi')),
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
              : _vouchers.isEmpty
                  ? const Center(child: Text('Chưa có voucher nào khả dụng', style: TextStyle(color: AppColors.mutedForeground)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _vouchers.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, i) => Center(child: VoucherCard(voucher: _toOffer(_vouchers[i]))),
                      ),
                    ),
    );
  }
}
