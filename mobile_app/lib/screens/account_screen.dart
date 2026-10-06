import 'package:flutter/material.dart';
import '../state/auth_scope.dart';
import '../theme/app_theme.dart';
import 'coming_soon_screen.dart';
import 'login_screen.dart';
import 'orders_screen.dart';
import 'vouchers_screen.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = AuthScope.of(context);
    final user = auth.user;
    return Scaffold(
      appBar: AppBar(title: const Text('Tài khoản')),
      body: ListView(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            color: AppColors.surface,
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.primaryLight,
                  child: Icon(Icons.person_rounded, color: AppColors.primaryDark, size: 28),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user?.fullName ?? 'Khách', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                      const SizedBox(height: 4),
                      if (user == null)
                        OutlinedButton(
                          onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen())),
                          style: OutlinedButton.styleFrom(minimumSize: const Size(0, 32), padding: const EdgeInsets.symmetric(horizontal: 14)),
                          child: const Text('Đăng nhập / Đăng ký', style: TextStyle(fontSize: 12.5)),
                        )
                      else
                        OutlinedButton(
                          onPressed: auth.logout,
                          style: OutlinedButton.styleFrom(minimumSize: const Size(0, 32), padding: const EdgeInsets.symmetric(horizontal: 14)),
                          child: const Text('Đăng xuất', style: TextStyle(fontSize: 12.5)),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _MenuTile(
            icon: Icons.receipt_long_outlined,
            label: 'Đơn hàng của tôi',
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const OrdersScreen())),
          ),
          _MenuTile(
            icon: Icons.confirmation_number_outlined,
            label: 'Voucher của tôi',
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const VouchersScreen())),
          ),
          _MenuTile(
            icon: Icons.location_on_outlined,
            label: 'Địa chỉ giao hàng',
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ComingSoonScreen(title: 'Địa chỉ giao hàng'))),
          ),
          _MenuTile(
            icon: Icons.account_balance_wallet_outlined,
            label: 'Ví của tôi',
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ComingSoonScreen(title: 'Ví của tôi'))),
          ),
          _MenuTile(
            icon: Icons.settings_outlined,
            label: 'Cài đặt',
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ComingSoonScreen(title: 'Cài đặt'))),
          ),
          _MenuTile(
            icon: Icons.help_outline_rounded,
            label: 'Trợ giúp',
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ComingSoonScreen(title: 'Trợ giúp'))),
          ),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ListTile(
          leading: Icon(icon, color: AppColors.foreground),
          title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.mutedForeground),
          onTap: onTap,
        ),
        const Divider(height: 1, color: AppColors.border),
      ],
    );
  }
}
