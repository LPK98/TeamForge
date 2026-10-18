import { MailPlus, Shield, Trash2, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { collaborationApi, type ProjectMember } from "../api/collaboration.api";
import { getAuthErrorMessage } from "../pages/auth-errors";
import { useAuth } from "../contexts/auth-context";
import { StyledSelect } from "./StyledSelect";
import { UserAvatar } from "./UserAvatar";

export function ProjectMembersPanel({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await collaborationApi.members(projectId));
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't load project members."));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void Promise.resolve().then(() => loadMembers());
  }, [loadMembers]);

  const currentMember = members.find((member) => member.id === user?.id);
  const canManage = currentMember?.role === "owner" || currentMember?.role === "manager";

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await collaborationApi.invite(projectId, email);
      setEmail("");
      setNotice("Invitation created. The invitee can accept it from their Invitations panel.");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't create the invitation."));
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (member: ProjectMember, role: "manager" | "member") => {
    setBusy(true);
    try {
      await collaborationApi.updateRole(projectId, member.id, role);
      await loadMembers();
      setNotice("Member role updated.");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't update that role."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (member: ProjectMember) => {
    if (!window.confirm(`Remove ${member.name} from this project?`)) return;
    setBusy(true);
    try {
      await collaborationApi.removeMember(projectId, member.id);
      await loadMembers();
      setNotice("Member removed.");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't remove that member."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tf-members-panel tf-glass-card" aria-labelledby="members-heading">
      <div className="tf-project-section-heading">
        <div><div className="tf-section-kicker">COLLABORATION</div><h2 id="members-heading">Project members</h2><p>People with access to this project.</p></div>
        <UserRound size={20} />
      </div>
      {error && <p className="tf-project-alert" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError("")}><X size={14} /></button></p>}
      {notice && <p className="tf-project-success" role="status">{notice}</p>}
      {loading ? <p className="tf-project-state">Loading members...</p> : <div className="tf-member-list">{members.map((member) => <div className="tf-member-row" key={member.id}><UserAvatar name={member.name} avatarUrl={member.avatar_url} size="small" className="tf-member-avatar" /><div><strong>{member.name}</strong><span>{member.email}</span></div><span className={`tf-member-role role-${member.role}`}><Shield size={12} />{member.role}</span>{canManage && member.role !== "owner" && <><StyledSelect ariaLabel={`Change role for ${member.name}`} value={member.role} disabled={busy} options={[{ value: "member", label: "Member" }, { value: "manager", label: "Manager" }]} onChange={(value) => void changeRole(member, value as "manager" | "member")} className="tf-member-role-select" /><button className="tf-icon-button" aria-label={`Remove ${member.name}`} disabled={busy} onClick={() => void remove(member)}><Trash2 size={15} /></button></>}</div>)}</div>}
      {canManage && <form className="tf-member-invite" onSubmit={(event) => void invite(event)}><MailPlus size={16} /><input aria-label="Invite member by email" type="email" placeholder="Invite by email address" value={email} onChange={(event) => setEmail(event.target.value)} required /><button className="tf-primary-button" disabled={busy}>{busy ? "Working..." : "Invite"}</button></form>}
    </section>
  );
}
