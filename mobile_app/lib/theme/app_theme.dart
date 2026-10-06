import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens kept in sync with the web homepage (styles.css)
/// so the brand feels identical across web and mobile.
class AppColors {
  AppColors._();

  static const primary = Color(0xFFF0562E);
  static const primaryDark = Color(0xFFD6431F);
  static const primaryLight = Color(0xFFFFE9E1);
  static const onPrimary = Color(0xFFFFFFFF);

  static const trust = Color(0xFF16A34A);
  static const trustLight = Color(0xFFE7F7ED);
  static const urgent = Color(0xFFE11D48);

  static const background = Color(0xFFF8F9FA);
  static const surface = Color(0xFFFFFFFF);
  static const foreground = Color(0xFF1A1A1A);
  static const mutedForeground = Color(0xFF6B7280);
  static const border = Color(0xFFF1F1F4);
}

class AppSpacing {
  AppSpacing._();
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const xl = 32.0;
  static const xxl = 48.0;
}

class AppRadius {
  AppRadius._();
  static const sm = 12.0;
  static const md = 16.0;
  static const lg = 24.0;
}

ThemeData buildAppTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      primary: AppColors.primary,
      onPrimary: AppColors.onPrimary,
      surface: AppColors.surface,
      background: AppColors.background,
    ),
    scaffoldBackgroundColor: AppColors.background,
  );

  final modernFont = GoogleFonts.plusJakartaSansTextTheme(base.textTheme);

  return base.copyWith(
    textTheme: modernFont.copyWith(
      titleLarge: modernFont.titleLarge?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.5),
      titleMedium: modernFont.titleMedium?.copyWith(fontWeight: FontWeight.w700),
      bodyMedium: modernFont.bodyMedium?.copyWith(color: AppColors.foreground),
      headlineSmall: modernFont.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: AppColors.foreground,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        color: AppColors.foreground,
        fontSize: 18,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.2,
      ),
    ),
    cardTheme: CardTheme(
      color: AppColors.surface,
      elevation: 8,
      shadowColor: const Color(0x14000000),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
      margin: EdgeInsets.zero,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
    ),
    dividerTheme: const DividerThemeData(color: AppColors.border, thickness: 1),
  );
}
