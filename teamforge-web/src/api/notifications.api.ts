import api from "../services/api";

export interface NotificationInvitation {
  id: number;
  project_id: number;
  project_name: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  expires_at: string;
  inviter: { id: number; name: string; avatar_url?: string | null } | null;
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  invitation: NotificationInvitation | null;
}

interface NotificationsResponse {
  notifications: AppNotification[];
  unread_count: number;
}

export const notificationsApi = {
  async list(): Promise<NotificationsResponse> {
    const response = await api.get<NotificationsResponse>("/notifications");
    return response.data;
  },

  async markRead(id: number): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await api.post("/notifications/read-all");
  },
};
