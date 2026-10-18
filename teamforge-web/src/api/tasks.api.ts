import api from "../services/api";

export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskProject {
  id: number;
  name: string;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: number | null;
  assignee?: { id: number; name: string; email: string; avatar_url?: string | null } | null;
  project?: TaskProject;
  created_at: string;
  updated_at: string;
}

export interface TaskPayload {
  project_id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  assigned_to: number | null;
}

export interface TaskFilters {
  project_id?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
}

interface TasksResponse {
  tasks: Task[];
}

interface TaskResponse {
  task: Task;
}

interface TaskMutationResponse extends TaskResponse {
  message: string;
}

interface MessageResponse {
  message: string;
}

export const tasksApi = {
  async list(filters: TaskFilters = {}): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters.project_id !== undefined) params.set("project_id", String(filters.project_id));
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    const query = params.toString();
    const response = await api.get<TasksResponse>(query ? `/tasks?${query}` : "/tasks");
    return response.data.tasks;
  },

  async get(id: number): Promise<Task> {
    const response = await api.get<TaskResponse>(`/tasks/${id}`);
    return response.data.task;
  },

  async create(payload: TaskPayload): Promise<Task> {
    const response = await api.post<TaskMutationResponse>("/tasks", payload);
    return response.data.task;
  },

  async update(id: number, payload: TaskPayload): Promise<Task> {
    const response = await api.put<TaskMutationResponse>(`/tasks/${id}`, payload);
    return response.data.task;
  },

  async remove(id: number): Promise<string> {
    const response = await api.delete<MessageResponse>(`/tasks/${id}`);
    return response.data.message;
  },
};
