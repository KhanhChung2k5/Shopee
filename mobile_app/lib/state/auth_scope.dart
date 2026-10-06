import 'package:flutter/widgets.dart';
import 'auth_state.dart';

/// Makes a single [AuthState] available anywhere below it in the tree,
/// mirroring CartScope's InheritedNotifier approach.
class AuthScope extends InheritedNotifier<AuthState> {
  const AuthScope({super.key, required AuthState auth, required super.child}) : super(notifier: auth);

  static AuthState of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AuthScope>();
    assert(scope != null, 'No AuthScope found in context');
    return scope!.notifier!;
  }
}
