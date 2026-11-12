import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/teamforge_api.dart';
import '../../shared/widgets/glass_panel.dart';

class TeamScreen extends ConsumerWidget {
  const TeamScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _AsyncTeamList(api: ref.watch(teamForgeApiProvider));
  }
}

class _AsyncTeamList extends StatefulWidget {
  const _AsyncTeamList({required this.api});
  final TeamForgeApi api;

  @override
  State<_AsyncTeamList> createState() => _AsyncTeamListState();
}

class _AsyncTeamListState extends State<_AsyncTeamList> {
  late Future<List<TfMember>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.api.members();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Team members')),
        body: FutureBuilder<List<TfMember>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Center(child: Text('Could not load team members: ${snapshot.error}'));
            }
            final members = snapshot.data ?? [];
            if (members.isEmpty) return const Center(child: Text('No team members yet.'));
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: members.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final member = members[index];
                return GlassPanel(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(child: Text(member.name.isEmpty ? '?' : member.name[0])),
                    title: Text(member.name),
                    subtitle: Text('${member.email}\n${member.role}'),
                    isThreeLine: true,
                  ),
                );
              },
            );
          },
        ),
      );
}
