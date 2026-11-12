import api from "../services/api";

export interface GitHubAccount {
  id?: number;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
}

export interface GitHubStatus {
  connected: boolean;
  account?: GitHubAccount | null;
}

export interface GitHubRepository {
  id: number | string;
  owner: string;
  name: string;
  full_name: string;
  description?: string | null;
  html_url: string;
  clone_url?: string;
  default_branch?: string;
  private: boolean;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  updated_at?: string;
}

export interface PaginatedRepositories {
  repositories: GitHubRepository[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface ApiResponse<T> { data: T; }

export const githubApi = {
  async status(): Promise<GitHubStatus> {
    const response = await api.get<GitHubStatus>("/github/status");
    return response.data;
  },
  async authorizationUrl(): Promise<string> {
    const response = await api.get<{ url: string; authorization_url?: string }>("/github/connect");
    return response.data.url ?? response.data.authorization_url ?? "";
  },
  async disconnect(): Promise<void> {
    await api.delete("/github/connect");
  },
  async sync(): Promise<void> {
    await api.post("/github/repositories/sync");
  },
  async repositories(params: { page?: number; per_page?: number; search?: string; visibility?: "all" | "public" | "private" } = {}): Promise<PaginatedRepositories> {
    const response = await api.get<PaginatedRepositories>("/github/repositories", { params });
    return response.data;
  },
  async repository(owner: string, name: string): Promise<GitHubRepository> {
    const response = await api.get<ApiResponse<GitHubRepository> | GitHubRepository>(`/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`);
    return "data" in response.data ? response.data.data : response.data;
  },
  async importIntoProject(owner: string, name: string, projectId: number): Promise<void> {
    await api.post(`/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/import`, { project_id: projectId });
  },
};
