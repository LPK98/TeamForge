import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../network/api_client.dart';
import '../network/teamforge_api.dart';

class AuthController extends ChangeNotifier {
  AuthController(this._storage, this._api) {
    _restore();
  }

  final FlutterSecureStorage _storage;
  final TeamForgeApi _api;
  TfUser? user;
  bool isLoading = true;

  bool get isAuthenticated => user != null;

  Future<void> _restore() async {
    try {
      final token = await _storage.read(key: 'teamforge.sanctum_token');
      if (token != null && token.isNotEmpty) {
        user = await _api.me();
      }
    } catch (_) {
      try {
        await _storage.delete(key: 'teamforge.sanctum_token');
      } catch (_) {
        // Secure storage may be unavailable in a desktop/widget-test host.
      }
    }
    isLoading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final response = await _api.login(email.trim(), password);
    final token = _api.lastToken;
    if (token == null || token.isEmpty) {
      throw StateError('The sign-in response did not contain a token.');
    }
    await _storage.write(key: 'teamforge.sanctum_token', value: token);
    user = response;
    notifyListeners();
  }

  Future<void> register(
    String name,
    String email,
    String password,
    String confirmation,
  ) async {
    final response = await _api.register(
      name.trim(),
      email.trim(),
      password,
      confirmation,
    );
    final token = _api.lastToken;
    if (token == null || token.isEmpty) {
      throw StateError('The registration response did not contain a token.');
    }
    await _storage.write(key: 'teamforge.sanctum_token', value: token);
    user = response;
    notifyListeners();
  }

  Future<void> updateName(String name) async {
    user = await _api.updateProfile(name.trim());
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await _api.logout();
    } finally {
      await _storage.delete(key: 'teamforge.sanctum_token');
      user = null;
      notifyListeners();
    }
  }
}

final authControllerProvider = ChangeNotifierProvider<AuthController>((ref) {
  return AuthController(
    ref.watch(secureStorageProvider),
    ref.watch(teamForgeApiProvider),
  );
});
