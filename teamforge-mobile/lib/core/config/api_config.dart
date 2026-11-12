abstract final class ApiConfig {
  static const _defaultBaseUrl = 'http://10.0.2.2:8000/api';

  /// Override with `--dart-define=API_BASE_URL=...` for local devices or deploys.
  static const configuredBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: _defaultBaseUrl,
  );

  static String get baseUrl {
    final value = configuredBaseUrl.trim().replaceFirst(RegExp(r'/+$'), '');
    return value.toLowerCase().endsWith('/api') ? value : '$value/api';
  }
}
