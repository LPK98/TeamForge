import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/api_config.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>(
  (ref) => const FlutterSecureStorage(),
);

final apiClientProvider = Provider<Dio>((ref) {
  final storage = ref.watch(secureStorageProvider);
  final dio = Dio(
    BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      sendTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: const {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.read(key: 'teamforge.sanctum_token');
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          await storage.delete(key: 'teamforge.sanctum_token');
        }
        handler.next(error);
      },
    ),
  );

  return dio;
});

String apiErrorMessage(DioException error) {
  final statusCode = error.response?.statusCode;
  final data = error.response?.data;
  if (data is Map<String, dynamic> && data['message'] is String) {
    return data['message'] as String;
  }
  if (statusCode != null && statusCode >= 500) {
    return 'TeamForge is having trouble right now. Try again shortly.';
  }

  return switch (statusCode) {
    401 => 'Your session has expired. Please sign in again.',
    403 => 'You do not have permission to do that.',
    422 => 'Please check the information and try again.',
    _ when error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError =>
      'Could not connect to TeamForge. Check your connection and API address.',
    _ => 'The request could not be completed. Please try again.',
  };
}
