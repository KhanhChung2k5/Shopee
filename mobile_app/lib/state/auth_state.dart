import 'package:flutter/foundation.dart';
import '../services/api_client.dart';

class AuthUser {
  AuthUser({required this.id, required this.role, required this.fullName, this.department});

  final String id;
  final String role;
  final String fullName;
  final String? department;
}

/// In-memory auth state backed by the real Identity API (/auth/register,
/// /auth/login, /users/me) — session-only, cleared on app restart (no
/// persistence package added, consistent with CartState's in-memory-only design).
class AuthState extends ChangeNotifier {
  final ApiClient _api = ApiClient();

  String? _token;
  AuthUser? _user;
  bool isLoading = false;
  String? error;

  bool get isLoggedIn => _token != null;
  AuthUser? get user => _user;
  String? get token => _token;

  Future<bool> register({required String email, required String password, required String fullName}) {
    return _submit(() => _api.post('/auth/register', {
          'email': email,
          'password': password,
          'fullName': fullName,
        }));
  }

  Future<bool> login({required String emailOrPhone, required String password}) {
    return _submit(() => _api.post('/auth/login', {
          'emailOrPhone': emailOrPhone,
          'password': password,
        }));
  }

  Future<bool> _submit(Future<Map<String, dynamic>> Function() call) async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      final body = await call();
      _token = body['token'] as String;
      _user = AuthUser(
        id: body['userId'] as String,
        role: body['role'] as String,
        fullName: body['fullName'] as String,
        department: body['department'] as String?,
      );
      return true;
    } on ApiException catch (e) {
      error = e.message;
      return false;
    } catch (_) {
      error = 'Không thể kết nối tới server';
      return false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshProfile() async {
    if (_token == null) return;
    try {
      final body = await _api.get('/users/me', token: _token);
      _user = AuthUser(
        id: _user!.id,
        role: _user!.role,
        fullName: body['fullName'] as String? ?? _user!.fullName,
        department: _user!.department,
      );
      notifyListeners();
    } catch (_) {
      // Keep showing the last known profile if the refresh call fails.
    }
  }

  void logout() {
    _token = null;
    _user = null;
    notifyListeners();
  }
}
