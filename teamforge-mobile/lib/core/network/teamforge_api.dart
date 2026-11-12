import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';

class TfUser {
  const TfUser({
    required this.id,
    required this.name,
    required this.email,
    this.avatarUrl,
  });

  final int id;
  final String name;
  final String email;
  final String? avatarUrl;

  factory TfUser.fromJson(Map<String, dynamic> json) => TfUser(
        id: json['id'] as int,
        name: json['name'] as String? ?? '',
        email: json['email'] as String? ?? '',
        avatarUrl: json['avatar_url'] as String?,
      );
}

class TfProject {
  const TfProject({
    required this.id,
    required this.name,
    required this.status,
    this.description,
    this.startDate,
    this.dueDate,
    this.tasksCount = 0,
    this.completedTasksCount = 0,
    this.progress = 0,
  });

  final int id;
  final String name;
  final String status;
  final String? description;
  final String? startDate;
  final String? dueDate;
  final int tasksCount;
  final int completedTasksCount;
  final int progress;

  factory TfProject.fromJson(Map<String, dynamic> json) => TfProject(
        id: json['id'] as int,
        name: json['name'] as String? ?? '',
        status: json['status'] as String? ?? 'planning',
        description: json['description'] as String?,
        startDate: json['start_date'] as String?,
        dueDate: json['due_date'] as String?,
        tasksCount: json['tasks_count'] as int? ?? 0,
        completedTasksCount: json['completed_tasks_count'] as int? ?? 0,
        progress: json['progress'] as int? ?? 0,
      );
}

class TfTask {
  const TfTask({
    required this.id,
    required this.projectId,
    required this.title,
    required this.status,
    required this.priority,
    this.description,
    this.dueDate,
    this.assignedTo,
    this.assignee,
    this.projectName,
  });

  final int id;
  final int projectId;
  final String title;
  final String status;
  final String priority;
  final String? description;
  final String? dueDate;
  final int? assignedTo;
  final TfUser? assignee;
  final String? projectName;

  factory TfTask.fromJson(Map<String, dynamic> json) => TfTask(
        id: json['id'] as int,
        projectId: json['project_id'] as int,
        title: json['title'] as String? ?? '',
        status: json['status'] as String? ?? 'todo',
        priority: json['priority'] as String? ?? 'medium',
        description: json['description'] as String?,
        dueDate: json['due_date'] as String?,
        assignedTo: json['assigned_to'] as int?,
        assignee: json['assignee'] is Map<String, dynamic>
            ? TfUser.fromJson(json['assignee'] as Map<String, dynamic>)
            : null,
        projectName: (json['project'] as Map<String, dynamic>?)?['name'] as String?,
      );
}

class TfNotification {
  const TfNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.isRead,
    required this.createdAt,
    this.invitationId,
  });

  final int id;
  final String title;
  final String message;
  final bool isRead;
  final String createdAt;
  final int? invitationId;

  factory TfNotification.fromJson(Map<String, dynamic> json) =>
      TfNotification(
        id: json['id'] as int,
        title: json['title'] as String? ?? 'Notification',
        message: json['message'] as String? ?? '',
        isRead: json['is_read'] as bool? ?? false,
        createdAt: json['created_at'] as String? ?? '',
        invitationId:
            (json['invitation'] as Map<String, dynamic>?)?['id'] as int?,
      );
}

class TfMember {
  const TfMember({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.avatarUrl,
  });

  final int id;
  final String name;
  final String email;
  final String role;
  final String? avatarUrl;

  factory TfMember.fromJson(Map<String, dynamic> json) => TfMember(
        id: json['id'] as int,
        name: json['name'] as String? ?? '',
        email: json['email'] as String? ?? '',
        role: json['role'] as String? ?? 'member',
        avatarUrl: json['avatar_url'] as String?,
      );
}

class TfActivity {
  const TfActivity({
    required this.id,
    required this.description,
    required this.type,
    required this.createdAt,
    this.projectName,
    this.actor,
  });

  final int id;
  final String description;
  final String type;
  final String createdAt;
  final String? projectName;
  final TfUser? actor;

  factory TfActivity.fromJson(Map<String, dynamic> json) => TfActivity(
        id: json['id'] as int,
        description: json['description'] as String? ?? '',
        type: json['type'] as String? ?? '',
        createdAt: json['created_at'] as String? ?? '',
        projectName:
            (json['project'] as Map<String, dynamic>?)?['name'] as String?,
        actor: json['actor'] is Map<String, dynamic>
            ? TfUser.fromJson(json['actor'] as Map<String, dynamic>)
            : null,
      );
}

class TfRepository {
  const TfRepository({
    required this.owner,
    required this.name,
    required this.fullName,
    required this.url,
    required this.isPrivate,
    this.description,
    this.language,
    this.stars = 0,
    this.forks = 0,
  });

  final String owner;
  final String name;
  final String fullName;
  final String url;
  final bool isPrivate;
  final String? description;
  final String? language;
  final int stars;
  final int forks;

  factory TfRepository.fromJson(Map<String, dynamic> json) => TfRepository(
        owner: json['owner'] as String? ?? '',
        name: json['name'] as String? ?? '',
        fullName: json['full_name'] as String? ?? '',
        url: json['html_url'] as String? ?? '',
        isPrivate: json['private'] as bool? ?? false,
        description: json['description'] as String?,
        language: json['language'] as String?,
        stars: json['stargazers_count'] as int? ?? 0,
        forks: json['forks_count'] as int? ?? 0,
      );
}

class TeamForgeApi {
  TeamForgeApi(this._dio);

  final Dio _dio;
  String? lastToken;

  Future<Map<String, dynamic>> _map(Response<dynamic> response) async =>
      Map<String, dynamic>.from(response.data as Map);

  Future<TfUser> login(String email, String password) async {
    final response = await _dio.post('/login', data: {
      'email': email,
      'password': password,
    });
    final data = await _map(response);
    lastToken = data['token'] as String?;
    return TfUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<TfUser> register(
    String name,
    String email,
    String password,
    String confirmation,
  ) async {
    final response = await _dio.post('/register', data: {
      'name': name,
      'email': email,
      'password': password,
      'password_confirmation': confirmation,
    });
    final data = await _map(response);
    lastToken = data['token'] as String?;
    return TfUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<TfUser> me() async {
    final data = await _map(await _dio.get('/user'));
    return TfUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<void> logout() => _dio.post('/logout');

  Future<TfUser> updateProfile(String name) async {
    final data = await _map(await _dio.patch('/profile', data: {'name': name}));
    return TfUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<List<TfProject>> projects() async {
    final data = await _map(await _dio.get('/projects'));
    return (data['projects'] as List)
        .map((item) => TfProject.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<TfProject> project(int id) async {
    final data = await _map(await _dio.get('/projects/$id'));
    return TfProject.fromJson(data['project'] as Map<String, dynamic>);
  }

  Future<TfProject> saveProject({
    int? id,
    required String name,
    required String description,
    required String status,
    required String startDate,
    required String dueDate,
  }) async {
    final payload = {
      'name': name,
      'description': description,
      'status': status,
      'start_date': startDate,
      'due_date': dueDate,
    };
    final response = id == null
        ? await _dio.post('/projects', data: payload)
        : await _dio.put('/projects/$id', data: payload);
    final data = await _map(response);
    return TfProject.fromJson(data['project'] as Map<String, dynamic>);
  }

  Future<void> deleteProject(int id) => _dio.delete('/projects/$id');

  Future<List<TfTask>> tasks() async {
    final data = await _map(await _dio.get('/tasks'));
    return (data['tasks'] as List)
        .map((item) => TfTask.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<TfTask> saveTask({
    int? id,
    required int projectId,
    required String title,
    required String description,
    required String status,
    required String priority,
    required String dueDate,
    int? assignedTo,
  }) async {
    final payload = {
      'project_id': projectId,
      'title': title,
      'description': description,
      'status': status,
      'priority': priority,
      'due_date': dueDate,
      'assigned_to': assignedTo,
    };
    final response = id == null
        ? await _dio.post('/tasks', data: payload)
        : await _dio.put('/tasks/$id', data: payload);
    final data = await _map(response);
    return TfTask.fromJson(data['task'] as Map<String, dynamic>);
  }

  Future<void> deleteTask(int id) => _dio.delete('/tasks/$id');

  Future<List<TfNotification>> notifications() async {
    final data = await _map(await _dio.get('/notifications'));
    return (data['notifications'] as List)
        .map((item) =>
            TfNotification.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<void> markNotificationRead(int id) =>
      _dio.patch('/notifications/$id/read');

  Future<void> markAllNotificationsRead() => _dio.post('/notifications/read-all');

  Future<List<TfMember>> members() async {
    final data = await _map(await _dio.get('/team-members'));
    return (data['members'] as List)
        .map((item) => TfMember.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<List<TfActivity>> activities() async {
    final data = await _map(await _dio.get('/activities'));
    return (data['data'] as List)
        .map((item) => TfActivity.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<List<TfRepository>> repositories() async {
    final data = await _map(await _dio.get('/github/repositories'));
    return (data['repositories'] as List)
        .map((item) =>
            TfRepository.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }
}

final teamForgeApiProvider = Provider<TeamForgeApi>((ref) {
  return TeamForgeApi(ref.watch(apiClientProvider));
});
