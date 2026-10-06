import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Generic placeholder for menu items that are real navigation targets
/// but whose full feature is out of scope for this mockup.
class ComingSoonScreen extends StatelessWidget {
  const ComingSoonScreen({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.construction_rounded, size: 48, color: AppColors.mutedForeground),
              const SizedBox(height: 16),
              Text(
                'Tính năng "$title" đang được phát triển',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.mutedForeground, fontSize: 14),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
