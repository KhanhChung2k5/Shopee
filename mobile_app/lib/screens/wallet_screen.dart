import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/wallet_service.dart';
import '../state/auth_scope.dart';
import '../theme/app_theme.dart';

String _formatVnd(num value) {
  final s = value.toInt().toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    final posFromEnd = s.length - i;
    buf.write(s[i]);
    if (posFromEnd > 1 && posFromEnd % 3 == 1) buf.write('.');
  }
  return '₫$buf';
}

const Map<String, String> _typeLabel = {'topup': 'Nạp tiền', 'payment': 'Thanh toán đơn hàng', 'refund': 'Hoàn tiền'};

/// KAN-283: real wallet balance + transaction history + top-up,
/// backed by `/wallet`, `/wallet/transactions`, `/wallet/topups`.
class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  final WalletService _service = WalletService();
  num _balance = 0;
  List<WalletTransaction> _transactions = [];
  bool _loading = true;
  String? _error;
  bool _toppingUp = false;

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
      final results = await Future.wait([
        _service.fetchBalance(token: token),
        _service.fetchTransactions(token: token),
      ]);
      if (!mounted) return;
      setState(() {
        _balance = results[0] as num;
        _transactions = results[1] as List<WalletTransaction>;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error is ApiException ? error.message : 'Không tải được thông tin ví';
      });
    }
  }

  Future<void> _topUp() async {
    final controller = TextEditingController();
    final amountText = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nạp tiền vào ví'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Số tiền (VNĐ)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Huỷ')),
          FilledButton(onPressed: () => Navigator.of(context).pop(controller.text.trim()), child: const Text('Nạp tiền')),
        ],
      ),
    );
    final amount = num.tryParse(amountText ?? '');
    if (amount == null || amount <= 0) return;

    final token = AuthScope.of(context).token;
    if (token == null) return;
    setState(() => _toppingUp = true);
    try {
      final newBalance = await _service.topUp(amount, token: token);
      if (!mounted) return;
      setState(() => _balance = newBalance);
      await _load();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(error is ApiException ? error.message : 'Nạp tiền thất bại'),
      ));
    } finally {
      if (mounted) setState(() => _toppingUp = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ví của tôi')),
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
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryDark]),
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('Số dư khả dụng', style: TextStyle(color: Colors.white70, fontSize: 13)),
                          const SizedBox(height: 6),
                          Text(_formatVnd(_balance), style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
                          const SizedBox(height: 14),
                          OutlinedButton(
                            onPressed: _toppingUp ? null : _topUp,
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.white,
                              side: const BorderSide(color: Colors.white70),
                            ),
                            child: Text(_toppingUp ? 'Đang xử lý…' : 'Nạp tiền'),
                          ),
                        ]),
                      ),
                      const SizedBox(height: 20),
                      const Text('Lịch sử giao dịch', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      const SizedBox(height: 8),
                      if (_transactions.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(child: Text('Chưa có giao dịch nào', style: TextStyle(color: AppColors.mutedForeground))),
                        )
                      else
                        ..._transactions.map((tx) => Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(AppRadius.sm),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(_typeLabel[tx.type] ?? tx.type, style: const TextStyle(fontSize: 13)),
                                  Text(
                                    '${tx.type == 'payment' ? '−' : '+'} ${_formatVnd(tx.amount)}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: tx.type == 'payment' ? AppColors.urgent : AppColors.trust,
                                    ),
                                  ),
                                ],
                              ),
                            )),
                    ],
                  ),
                ),
    );
  }
}
