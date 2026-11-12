import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/teamforge_api.dart';
import '../../shared/widgets/glass_panel.dart';

class ProjectsScreen extends ConsumerStatefulWidget {
  const ProjectsScreen({super.key});

  @override
  ConsumerState<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends ConsumerState<ProjectsScreen> {
  late Future<List<TfProject>> _future;
  String _query = '';
  String _status = 'all';

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() => _future = ref.read(teamForgeApiProvider).projects();

  Future<void> _createProject() async {
    final name = TextEditingController();
    final description = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New project'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
          TextField(controller: description, decoration: const InputDecoration(labelText: 'Description')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Create')),
        ],
      ),
    );
    if (result != true || name.text.trim().isEmpty || !mounted) return;
    try {
      await ref.read(teamForgeApiProvider).saveProject(
            name: name.text,
            description: description.text,
            status: 'planning',
            startDate: '',
            dueDate: '',
          );
      setState(_load);
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Projects'),
          actions: [IconButton(onPressed: _createProject, icon: const Icon(Icons.add))],
        ),
        body: FutureBuilder<List<TfProject>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) return Center(child: Text('Could not load projects: ${snapshot.error}'));
            final projects = (snapshot.data ?? []).where((project) {
              final matchesQuery = '${project.name} ${project.description ?? ''}'.toLowerCase().contains(_query.toLowerCase());
              return matchesQuery && (_status == 'all' || project.status == _status);
            }).toList();
            return Column(children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: TextField(
                  decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search projects'),
                  onChanged: (value) => setState(() => _query = value),
                ),
              ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(children: ['all', 'planning', 'in_progress', 'completed', 'on_hold'].map((status) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(label: Text(status.replaceAll('_', ' ')), selected: _status == status, onSelected: (_) => setState(() => _status = status)),
                  );
                }).toList()),
              ),
              Expanded(
                child: projects.isEmpty
                    ? const Center(child: Text('No matching projects.'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: projects.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final project = projects[index];
                          return GlassPanel(
                            child: ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: const Icon(Icons.folder_copy_outlined),
                              title: Text(project.name),
                              subtitle: Text('${project.status.replaceAll('_', ' ')} · ${project.progress}% complete'),
                            ),
                          );
                        },
                      ),
              ),
            ]);
          },
        ),
      );
}
