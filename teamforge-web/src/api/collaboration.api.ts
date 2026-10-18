import api from "../services/api";

export type MemberRole = "owner" | "manager" | "member";

export interface ProjectMember {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  role: MemberRole;
}

export interface TeamMemberProject {
  id: number;
  name: string;
  role: MemberRole;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  created_at: string | null;
  projects: TeamMemberProject[];
}

export interface ProjectInvitation {
  id: number;
  project_id: number;
  invitee_email: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  expires_at: string;
  project?: { id: number; name: string };
}

interface MembersResponse {
  members: ProjectMember[];
}

interface InvitationsResponse {
  invitations: ProjectInvitation[];
}

interface InvitationResponse {
  invitation: ProjectInvitation;
  message: string;
}

interface MessageResponse {
  message: string;
}

interface TeamMembersResponse {
  members: TeamMember[];
  manageable_projects: TeamMemberProject[];
}

export const collaborationApi = {
  async teamMembers(): Promise<TeamMembersResponse> {
    const response = await api.get<TeamMembersResponse>("/team-members");
    return response.data;
  },
  async members(projectId: number): Promise<ProjectMember[]> {
    const response = await api.get<MembersResponse>(`/projects/${projectId}/members`);
    return response.data.members;
  },

  async invite(projectId: number, email: string): Promise<ProjectInvitation> {
    const response = await api.post<InvitationResponse>(`/projects/${projectId}/invitations`, { email });
    return response.data.invitation;
  },

  async updateRole(projectId: number, userId: number, role: Exclude<MemberRole, "owner">): Promise<void> {
    await api.patch<MessageResponse>(`/projects/${projectId}/members/${userId}`, { role });
  },

  async removeMember(projectId: number, userId: number): Promise<void> {
    await api.delete<MessageResponse>(`/projects/${projectId}/members/${userId}`);
  },

  async invitations(): Promise<ProjectInvitation[]> {
    const response = await api.get<InvitationsResponse>("/invitations");
    return response.data.invitations;
  },

  async acceptInvitation(id: number): Promise<void> {
    await api.post<MessageResponse>(`/invitations/${id}/accept`);
  },

  async rejectInvitation(id: number): Promise<void> {
    await api.post<MessageResponse>(`/invitations/${id}/reject`);
  },
};
