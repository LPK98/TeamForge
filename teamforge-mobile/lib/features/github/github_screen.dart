import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/teamforge_api.dart';
import '../../shared/widgets/glass_panel.dart';

class GitHubScreen extends ConsumerWidget {
  const GitHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _RepositoryList(api: ref.watch(teamForgeApiProvider));
  }
}

class _RepositoryList extends StatefulWidget {
  const _RepositoryList({required this.api});
  final TeamForgeApi api;

  @override
  State<_RepositoryList> createState() => _RepositoryListState();
}

class _RepositoryListState extends State<_RepositoryList> {
  late Future<List<TfRepository>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.api.repositories();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('GitHub repositories')),
        body: FutureBuilder<List<TfRepository>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text('Could not load repositories: ${snapshot.error}'));
            }
            final repositories = snapshot.data ?? [];
            if (repositories.isEmpty) return const Center(child: Text('No repositories found.'));
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: repositories.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final repository = repositories[index];
                return GlassPanel(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.source_outlined),
                    title: Text(repository.fullName),
                    subtitle: Text(repository.description ?? 'No description provided.'),
                    trailing: Text('${repository.stars} ★'),
                  ),
                );
              },
            );
          },
        ),
      );
}
