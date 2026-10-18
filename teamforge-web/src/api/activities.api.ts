import api from "../services/api";

export type ActivityType =
  | "project_created" | "project_updated" | "project_deleted"
  | "task_created" | "task_updated" | "task_status_changed" | "task_completed"
  | "task_assigned" | "task_deleted" | "member_invited" | "invitation_accepted"
  | "invitation_rejected" | "member_added" | "member_removed" | "member_role_changed";

export interface ActivityItem {
  id: number;
  project_id: number | null;
  actor_id: number | null;
  type: ActivityType;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: { id: number; name: string; email: string; avatar_url?: string | null } | null;
  project: { id: number; name: string } | null;
}

export interface ActivityFilters {
  project_id?: string;
  type?: ActivityType | "";
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

interface ActivitiesResponse {
  data: ActivityItem[];
  current_page: number;
  last_page: number;
  total: number;
}

export const activitiesApi = {
  async list(filters: ActivityFilters = {}): Promise<ActivitiesResponse> {
    const response = await api.get<ActivitiesResponse>("/activities", { params: filters });
    return response.data;
  },
};
