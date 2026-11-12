import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/network/teamforge_api.dart';
import '../../shared/widgets/glass_panel.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final api = ref.watch(teamForgeApiProvider);
    final user = ref.watch(authControllerProvider).user;
    return Scaffold(
      appBar: AppBar(
        title: const Text('TeamForge'),
        actions: [
          IconButton(onPressed: () => context.go('/activity'), icon: const Icon(Icons.history)),
          IconButton(onPressed: () => context.go('/notifications'), icon: const Icon(Icons.notifications_none)),
        ],
      ),
      body: FutureBuilder<List<dynamic>>(
        future: Future.wait([api.projects(), api.tasks()]),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Could not load your workspace: ${snapshot.error}'));
          }
          final projects = snapshot.data![0] as List<TfProject>;
          final tasks = snapshot.data![1] as List<TfTask>;
          final activeTasks = tasks.where((task) => task.status != 'completed').length;
          final firstName = user?.name.split(' ').first ?? 'there';
          return RefreshIndicator(
            onRefresh: () async {},
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              children: [
                Text('Welcome, $firstName!', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 6),
                Text('Here is what is happening with your workspace.',
                    style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 18),
                Row(children: [
                  Expanded(child: _Metric(label: 'Projects', value: '${projects.length}')),
                  const SizedBox(width: 10),
                  Expanded(child: _Metric(label: 'Active tasks', value: '$activeTasks')),
                ]),
                const SizedBox(height: 18),
                Text('Active projects', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 10),
                ...projects.take(3).map((project) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: GlassPanel(
                        child: ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.folder_copy_outlined),
                          title: Text(project.name),
                          subtitle: Text('${project.status.replaceAll('_', ' ')} · ${project.progress}% complete'),
                          onTap: () => context.go('/projects'),
                        ),
                      ),
                    )),
                if (projects.isEmpty) const Text('No projects yet. Create one from Projects.'),
                const SizedBox(height: 8),
                Text('Upcoming tasks', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 10),
                ...tasks.take(5).map((task) => CheckboxListTile(
                      value: task.status == 'completed',
                      onChanged: (_) {},
                      title: Text(task.title),
                      subtitle: Text(task.projectName ?? 'Project'),
                    )),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => GlassPanel(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 6),
          Text(value, style: Theme.of(context).textTheme.headlineMedium),
        ]),
      );
}
