import api from "../services/api";

export type ProjectStatus = "planning" | "in_progress" | "completed" | "on_hold";

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  tasks_count?: number;
  completed_tasks_count?: number;
  progress?: number;
}

export interface ProjectPayload {
  name: string;
  description: string;
  status: ProjectStatus;
  start_date: string;
  due_date: string;
}

interface ProjectsResponse {
  projects: Project[];
}

interface ProjectResponse {
  project: Project;
}

interface ProjectMutationResponse extends ProjectResponse {
  message: string;
}

interface MessageResponse {
  message: string;
}

export const projectsApi = {
  async list(): Promise<Project[]> {
    const response = await api.get<ProjectsResponse>("/projects");
    return response.data.projects;
  },

  async get(id: number): Promise<Project> {
    const response = await api.get<ProjectResponse>(`/projects/${id}`);
    return response.data.project;
  },

  async create(payload: ProjectPayload): Promise<Project> {
    const response = await api.post<ProjectMutationResponse>("/projects", payload);
    return response.data.project;
  },

  async update(id: number, payload: ProjectPayload): Promise<Project> {
    const response = await api.put<ProjectMutationResponse>(`/projects/${id}`, payload);
    return response.data.project;
  },

  async remove(id: number): Promise<string> {
    const response = await api.delete<MessageResponse>(`/projects/${id}`);
    return response.data.message;
  },
};
