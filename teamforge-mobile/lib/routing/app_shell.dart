import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_theme.dart';
import '../shared/widgets/app_background.dart';

class AppShell extends StatelessWidget {
  const AppShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: navigationShell,
        bottomNavigationBar: SafeArea(
          top: false,
          minimum: const EdgeInsets.fromLTRB(12, 0, 12, 10),
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.panelStrong,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppColors.border),
              boxShadow: const [
                BoxShadow(color: Color(0x30000000), blurRadius: 26, offset: Offset(0, 10)),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(22),
              child: NavigationBar(
                height: 68,
                selectedIndex: navigationShell.currentIndex,
                onDestinationSelected: (index) =>
                    navigationShell.goBranch(index, initialLocation: index == navigationShell.currentIndex),
                destinations: const [
                  NavigationDestination(icon: Icon(Icons.grid_view_rounded), label: 'Home'),
                  NavigationDestination(icon: Icon(Icons.folder_copy_outlined), label: 'Projects'),
                  NavigationDestination(icon: Icon(Icons.check_circle_outline_rounded), label: 'Tasks'),
                  NavigationDestination(icon: Icon(Icons.notifications_none_rounded), label: 'Alerts'),
                  NavigationDestination(icon: Icon(Icons.person_outline_rounded), label: 'Profile'),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
