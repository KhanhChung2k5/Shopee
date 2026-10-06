import 'package:flutter/material.dart';
import '../data/sample_data.dart';
import '../widgets/voucher_card.dart';

class VouchersScreen extends StatelessWidget {
  const VouchersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final vouchers = SampleData.vouchers;

    return Scaffold(
      appBar: AppBar(title: const Text('Voucher của tôi')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: vouchers.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) => Center(child: VoucherCard(voucher: vouchers[i])),
      ),
    );
  }
}
