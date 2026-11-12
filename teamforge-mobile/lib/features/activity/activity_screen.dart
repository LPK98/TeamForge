import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/teamforge_api.dart';
import '../../shared/widgets/glass_panel.dart';

class ActivityScreen extends ConsumerWidget {
  const ActivityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _ActivityList(api: ref.watch(teamForgeApiProvider));
  }
}

class _ActivityList extends StatefulWidget {
  const _ActivityList({required this.api});
  final TeamForgeApi api;

  @override
  State<_ActivityList> createState() => _ActivityListState();
}

class _ActivityListState extends State<_ActivityList> {
  late Future<List<TfActivity>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.api.activities();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Activity')),
        body: FutureBuilder<List<TfActivity>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text('Could not load activity: ${snapshot.error}'));
            }
            final items = snapshot.data ?? [];
            if (items.isEmpty) return const Center(child: Text('No activity yet.'));
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final item = items[index];
                return GlassPanel(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.bolt_rounded),
                    title: Text(item.description),
                    subtitle: Text('${item.projectName ?? 'Workspace'} · ${item.type}'),
                  ),
                );
              },
            );
          },
        ),
      );
}
