import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/teamforge_api.dart';
import '../../shared/widgets/glass_panel.dart';

class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> {
  late Future<List<TfTask>> _future;
  String _query = '';
  String _status = 'all';
  String _priority = 'all';

  @override
  void initState() {
    super.initState();
    _future = ref.read(teamForgeApiProvider).tasks();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Tasks')),
        body: FutureBuilder<List<TfTask>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError) return Center(child: Text('Could not load tasks: ${snapshot.error}'));
            final tasks = (snapshot.data ?? []).where((task) {
              final queryMatch = '${task.title} ${task.description ?? ''} ${task.projectName ?? ''}'.toLowerCase().contains(_query.toLowerCase());
              return queryMatch && (_status == 'all' || task.status == _status) && (_priority == 'all' || task.priority == _priority);
            }).toList();
            return Column(children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: TextField(decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search tasks'), onChanged: (value) => setState(() => _query = value)),
              ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(children: [
                  DropdownButton<String>(value: _status, items: ['all', 'todo', 'in_progress', 'completed'].map((value) => DropdownMenuItem(value: value, child: Text(value.replaceAll('_', ' ')))).toList(), onChanged: (value) => setState(() => _status = value!)),
                  const SizedBox(width: 18),
                  DropdownButton<String>(value: _priority, items: ['all', 'low', 'medium', 'high', 'urgent'].map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(), onChanged: (value) => setState(() => _priority = value!)),
                ]),
              ),
              Expanded(
                child: tasks.isEmpty ? const Center(child: Text('No matching tasks.')) : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: tasks.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final task = tasks[index];
                    return GlassPanel(child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(task.status == 'completed' ? Icons.check_circle : Icons.radio_button_unchecked),
                      title: Text(task.title),
                      subtitle: Text('${task.projectName ?? 'Project'} · ${task.priority} · ${task.status.replaceAll('_', ' ')}'),
                    ));
                  },
                ),
              ),
            ]);
          },
        ),
      );
}
