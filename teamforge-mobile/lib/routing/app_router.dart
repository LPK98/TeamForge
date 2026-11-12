import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/auth_controller.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/activity/activity_screen.dart';
import '../features/github/github_screen.dart';
import '../features/home/home_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/projects/projects_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/team/team_screen.dart';
import '../features/tasks/tasks_screen.dart';
import 'app_shell.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);
  return GoRouter(
    initialLocation: '/home',
    refreshListenable: auth,
    redirect: (context, state) {
      final isPublic = state.uri.path == '/login' || state.uri.path == '/register';
      if (auth.isLoading) return isPublic ? null : '/login';
      if (!auth.isAuthenticated && !isPublic) return '/login';
      if (auth.isAuthenticated && isPublic) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/projects', builder: (context, state) => const ProjectsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/tasks', builder: (context, state) => const TasksScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/notifications', builder: (context, state) => const NotificationsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
          ]),
        ],
      ),
      GoRoute(path: '/team-members', builder: (context, state) => const TeamScreen()),
      GoRoute(path: '/activity', builder: (context, state) => const ActivityScreen()),
      GoRoute(path: '/github', builder: (context, state) => const GitHubScreen()),
      GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
    ],
  );
});
