import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class FlashSaleCountdown extends StatefulWidget {
  const FlashSaleCountdown({super.key, required this.endsAt});

  final DateTime endsAt;

  @override
  State<FlashSaleCountdown> createState() => _FlashSaleCountdownState();
}

class _FlashSaleCountdownState extends State<FlashSaleCountdown> {
  late Timer _timer;
  Duration _remaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    _tick();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    final diff = widget.endsAt.difference(DateTime.now());
    setState(() => _remaining = diff.isNegative ? Duration.zero : diff);
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String _two(int n) => n.toString().padLeft(2, '0');

  Widget _box(String value) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: AppColors.foreground,
          borderRadius: BorderRadius.circular(5),
        ),
        child: Text(
          value,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12.5),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final h = _remaining.inHours;
    final m = _remaining.inMinutes % 60;
    final s = _remaining.inSeconds % 60;

    return Semantics(
      label: 'Flash sale kết thúc sau $h giờ $m phút',
      child: ExcludeSemantics(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Kết thúc trong ', style: TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
            _box(_two(h)),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 2),
              child: Text(':', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
            _box(_two(m)),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 2),
              child: Text(':', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
            _box(_two(s)),
          ],
        ),
      ),
    );
  }
}
