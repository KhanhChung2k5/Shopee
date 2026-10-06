import 'package:flutter/material.dart';
import '../models/product.dart';
import '../theme/app_theme.dart';

class VoucherCard extends StatefulWidget {
  const VoucherCard({super.key, required this.voucher});

  final VoucherOffer voucher;

  @override
  State<VoucherCard> createState() => _VoucherCardState();
}

class _VoucherCardState extends State<VoucherCard> {
  bool _saved = false;

  @override
  Widget build(BuildContext context) {
    final v = widget.voucher;
    final tint = v.isShipping ? AppColors.trustLight : AppColors.primaryLight;
    final tintFg = v.isShipping ? AppColors.trust : AppColors.primaryDark;

    return Container(
      width: 260,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        boxShadow: const [BoxShadow(color: Color(0x14141414), blurRadius: 10, offset: Offset(0, 3))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            width: 96,
            color: tint,
            padding: const EdgeInsets.all(8),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  v.amountLabel,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: tintFg, fontWeight: FontWeight.w800, fontSize: v.isShipping ? 14 : 18),
                ),
                const SizedBox(height: 4),
                Text(v.conditionLabel, textAlign: TextAlign.center, style: TextStyle(color: tintFg, fontSize: 11)),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    v.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    v.expiryLabel,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground),
                  ),
                  const SizedBox(height: 6),
                  SizedBox(
                    height: 32,
                    child: OutlinedButton(
                      onPressed: () => setState(() => _saved = !_saved),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: _saved ? AppColors.trust : Colors.transparent,
                        side: BorderSide(color: _saved ? AppColors.trust : AppColors.primary),
                        foregroundColor: _saved ? Colors.white : AppColors.primary,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                      ),
                      child: Text(_saved ? 'Đã lưu' : 'Lưu mã', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
