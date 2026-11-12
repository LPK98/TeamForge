import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import 'glass_panel.dart';

class FeaturePlaceholder extends StatelessWidget {
  const FeaturePlaceholder({
    required this.title,
    required this.description,
    required this.icon,
    super.key,
  });

  final String title;
  final String description;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          title: const Text('TeamForge'),
          actions: [
            IconButton(
              tooltip: 'Notifications',
              onPressed: () => context.go('/notifications'),
              icon: const Icon(Icons.notifications_none_rounded),
            ),
          ],
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
          sliver: SliverList.list(
            children: [
              Text(title, style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 8),
              Text(description, style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 24),
              GlassPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(icon, color: AppColors.blue, size: 28),
                    const SizedBox(height: 14),
                    Text('Your TeamForge workspace will appear here',
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 6),
                    Text(
                      'Sign-in and live workspace information will be added in the next development phase.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
