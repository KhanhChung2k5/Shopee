import 'package:flutter/widgets.dart';
import 'cart_state.dart';

/// Makes a single [CartState] available anywhere below it in the tree
/// without pulling in an external state-management package.
class CartScope extends InheritedNotifier<CartState> {
  const CartScope({super.key, required CartState cart, required super.child}) : super(notifier: cart);

  static CartState of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<CartScope>();
    assert(scope != null, 'No CartScope found in context');
    return scope!.notifier!;
  }
}
