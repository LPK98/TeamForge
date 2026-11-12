import 'package:flutter/material.dart';

abstract final class AppColors {
  static const background = Color(0xFF080D19);
  static const backgroundSoft = Color(0xFF0D1525);
  static const panel = Color(0xA6111C30);
  static const panelStrong = Color(0xD1132036);
  static const border = Color(0x1FB7CDFF);
  static const borderStrong = Color(0x3893B8FF);
  static const text = Color(0xFFEDF4FF);
  static const muted = Color(0xFF9BAAC2);
  static const subtle = Color(0xFF6F809C);
  static const blue = Color(0xFF70A7FF);
  static const blueStrong = Color(0xFF3F83F8);
}

abstract final class AppTheme {
  static ThemeData get dark {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.blueStrong,
      brightness: Brightness.dark,
      surface: AppColors.backgroundSoft,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background,
      fontFamily: 'Inter',
      textTheme: const TextTheme(
        headlineMedium: TextStyle(color: AppColors.text, fontWeight: FontWeight.w700),
        titleLarge: TextStyle(color: AppColors.text, fontWeight: FontWeight.w700),
        titleMedium: TextStyle(color: AppColors.text, fontWeight: FontWeight.w600),
        bodyLarge: TextStyle(color: AppColors.text),
        bodyMedium: TextStyle(color: AppColors.muted),
        bodySmall: TextStyle(color: AppColors.subtle),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.text,
        elevation: 0,
        centerTitle: false,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.backgroundSoft.withValues(alpha: 0.94),
        indicatorColor: AppColors.blueStrong.withValues(alpha: 0.2),
        labelTextStyle: WidgetStateProperty.resolveWith((states) => TextStyle(
              color: states.contains(WidgetState.selected)
                  ? AppColors.blue
                  : AppColors.subtle,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            )),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.panel,
        hintStyle: const TextStyle(color: AppColors.subtle),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.blue, width: 1.4),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.panelStrong,
        contentTextStyle: const TextStyle(color: AppColors.text),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}
