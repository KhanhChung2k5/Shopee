import 'package:flutter/material.dart';
import 'screens/main_shell.dart';
import 'state/auth_scope.dart';
import 'state/auth_state.dart';
import 'state/cart_scope.dart';
import 'state/cart_state.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const ChoTotMuaApp());
}

class ChoTotMuaApp extends StatefulWidget {
  const ChoTotMuaApp({super.key});

  @override
  State<ChoTotMuaApp> createState() => _ChoTotMuaAppState();
}

class _ChoTotMuaAppState extends State<ChoTotMuaApp> {
  final CartState _cart = CartState();
  final AuthState _auth = AuthState();

  @override
  void dispose() {
    _cart.dispose();
    _auth.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AuthScope(
      auth: _auth,
      child: CartScope(
        cart: _cart,
        child: MaterialApp(
          title: 'Chợ Tốt Mua',
          debugShowCheckedModeBanner: false,
          theme: buildAppTheme(),
          home: const MainShell(),
        ),
      ),
    );
  }
}
