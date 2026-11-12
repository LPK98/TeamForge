import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/teamforge_api.dart';
import '../../shared/widgets/glass_panel.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  late Future<List<TfNotification>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(teamForgeApiProvider).notifications();
  }

  Future<void> _markAllRead() async {
    await ref.read(teamForgeApiProvider).markAllNotificationsRead();
    setState(() => _future = ref.read(teamForgeApiProvider).notifications());
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Notifications'),
          actions: [IconButton(onPressed: _markAllRead, icon: const Icon(Icons.done_all))],
        ),
        body: FutureBuilder<List<TfNotification>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError) return Center(child: Text('Could not load notifications: ${snapshot.error}'));
            final items = snapshot.data ?? [];
            if (items.isEmpty) return const Center(child: Text('Nothing new.'));
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final notification = items[index];
                return GlassPanel(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(notification.isRead ? Icons.notifications_none : Icons.notifications_active),
                    title: Text(notification.title),
                    subtitle: Text(notification.message),
                    onTap: notification.isRead
                        ? null
                        : () async {
                            await ref.read(teamForgeApiProvider).markNotificationRead(notification.id);
                            setState(() => _future = ref.read(teamForgeApiProvider).notifications());
                          },
                  ),
                );
              },
            );
          },
        ),
      );
}
