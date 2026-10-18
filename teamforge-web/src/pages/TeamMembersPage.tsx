import { Check, MailPlus, Search, Shield, Trash2, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { NotificationBell } from "../components/NotificationBell";
import { WorkspaceSidebar } from "../components/WorkspaceSidebar";
import { StyledSelect } from "../components/StyledSelect";
import { collaborationApi, type MemberRole, type TeamMember, type TeamMemberProject } from "../api/collaboration.api";
import { getAuthErrorMessage } from "./auth-errors";
import "./TeamMembersPage.css";
import { UserAvatar } from "../components/UserAvatar";

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "—";
}

function roleLabel(role: MemberRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function TeamMembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [manageableProjects, setManageableProjects] = useState<TeamMemberProject[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | MemberRole>("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteProject, setInviteProject] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await collaborationApi.teamMembers();
      setMembers(result.members);
      setManageableProjects(result.manageable_projects);
      setError("");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't load your team members."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const filteredMembers = useMemo(() => members.filter((member) => {
    const matchesSearch = `${member.name} ${member.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || member.projects.some((project) => project.role === roleFilter);
    const matchesProject = projectFilter === "all" || member.projects.some((project) => String(project.id) === projectFilter);
    return matchesSearch && matchesRole && matchesProject;
  }), [members, projectFilter, roleFilter, search]);

  const roleCounts = useMemo(() => members.reduce((counts, member) => {
    const role = member.projects.some((project) => project.role === "owner")
      ? "owners"
      : member.projects.some((project) => project.role === "manager") ? "managers" : "members";
    counts[role] += 1;
    return counts;
  }, { owners: 0, managers: 0, members: 0 }), [members]);

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteProject) return;
    setBusy(true);
    setError("");
    try {
      await collaborationApi.invite(Number(inviteProject), email.trim());
      setNotice("Invitation sent. The invitee can respond from the in-app notification inbox.");
      setEmail("");
      setShowInvite(false);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't send that invitation."));
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (member: TeamMember, project: TeamMemberProject, role: "manager" | "member") => {
    setBusy(true);
    try {
      await collaborationApi.updateRole(project.id, member.id, role);
      await load();
      setNotice(`${member.name}'s role was updated for ${project.name}.`);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't update that role."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (member: TeamMember, project: TeamMemberProject) => {
    if (!window.confirm(`Remove ${member.name} from ${project.name}?`)) return;
    setBusy(true);
    try {
      await collaborationApi.removeMember(project.id, member.id);
      await load();
      setNotice(`${member.name} was removed from ${project.name}.`);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't remove that member."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tf-app">
      <WorkspaceSidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} onNotice={setNotice} />
      <main className="tf-team-page">
        <div className="tf-team-orb tf-team-orb-one" aria-hidden="true" />
        <div className="tf-team-orb tf-team-orb-two" aria-hidden="true" />
        <div className="tf-team-container">
          <header className="tf-team-header">
            <div><button className="tf-icon-button tf-team-menu-button" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Users size={18} /></button><div className="tf-section-kicker">WORKSPACE</div><h1>Team Members</h1><p>Everyone collaborating across your accessible projects.</p></div>
            <div className="tf-page-header-actions"><NotificationBell /><button className="tf-primary-button" onClick={() => setShowInvite(true)} disabled={manageableProjects.length === 0}><MailPlus size={17} />Invite member</button></div>
          </header>
          {notice && <div className="tf-team-notice" role="status">{notice}<button aria-label="Dismiss notice" onClick={() => setNotice("")}><X size={16} /></button></div>}
          {error && <p className="tf-team-alert" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError("")}><X size={15} /></button></p>}
          <section className="tf-team-stats" aria-label="Team member overview">
            <div className="tf-team-stat tf-glass-card"><span className="tf-team-stat-icon"><Users size={18} /></span><div><span>Total people</span><strong>{loading ? "—" : members.length}</strong></div><small>Unique across projects</small></div>
            <div className="tf-team-stat tf-glass-card"><span className="tf-team-stat-icon role-owner"><Shield size={18} /></span><div><span>Owners</span><strong>{loading ? "—" : roleCounts.owners}</strong></div><small>Project ownership</small></div>
            <div className="tf-team-stat tf-glass-card"><span className="tf-team-stat-icon role-manager"><Shield size={18} /></span><div><span>Managers</span><strong>{loading ? "—" : roleCounts.managers}</strong></div><small>Across accessible projects</small></div>
            <div className="tf-team-stat tf-glass-card"><span className="tf-team-stat-icon role-member"><Shield size={18} /></span><div><span>Members</span><strong>{loading ? "—" : roleCounts.members}</strong></div><small>Across accessible projects</small></div>
          </section>
          <section className="tf-team-panel tf-glass-card">
            <div className="tf-team-panel-heading"><div><div className="tf-section-kicker">COLLABORATION DIRECTORY</div><h2>People and access</h2><p>Roles shown here are specific to each project.</p></div><span className="tf-team-result-count">{filteredMembers.length} people</span></div>
            <div className="tf-team-toolbar">
              <label className="tf-team-search"><Search size={16} /><input aria-label="Search team members" placeholder="Search by name or email..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
              <StyledSelect ariaLabel="Filter by role" value={roleFilter} options={[{ value: "all", label: "All roles" }, { value: "owner", label: "Owners" }, { value: "manager", label: "Managers" }, { value: "member", label: "Members" }]} onChange={(value) => setRoleFilter(value as "all" | MemberRole)} className="tf-team-select" />
              <StyledSelect ariaLabel="Filter by project" value={projectFilter} options={[{ value: "all", label: "All projects" }, ...manageableProjects.map((project) => ({ value: String(project.id), label: project.name }))]} onChange={setProjectFilter} className="tf-team-select" />
            </div>
            {loading && <div className="tf-team-state">Loading team members...</div>}
            {!loading && filteredMembers.length === 0 && <div className="tf-team-empty"><Users size={28} /><h3>{members.length === 0 ? "No team members yet" : "No matching members"}</h3><p>{members.length === 0 ? "Invite someone to start collaborating on a project." : "Try a different search or filter."}</p></div>}
            {!loading && filteredMembers.length > 0 && <div className="tf-team-list">{filteredMembers.map((member) => <article className="tf-team-member" key={member.id}><div className="tf-team-person"><UserAvatar name={member.name} avatarUrl={member.avatar_url} size="medium" className="tf-team-avatar" /><div><strong>{member.name}</strong><span>{member.email}</span></div></div><div className="tf-team-projects">{member.projects.filter((project) => projectFilter === "all" || String(project.id) === projectFilter).map((project) => <div className="tf-team-project" key={project.id}><div><span>{project.name}</span><span className={`tf-team-role role-${project.role}`}><Shield size={11} />{roleLabel(project.role)}</span></div><small>Joined {formatDate(member.created_at)}</small>{project.role !== "owner" && manageableProjects.some((managed) => managed.id === project.id) && <div className="tf-team-actions"><StyledSelect ariaLabel={`Change ${member.name}'s role for ${project.name}`} value={project.role} disabled={busy} options={[{ value: "member", label: "Member" }, { value: "manager", label: "Manager" }]} onChange={(value) => void changeRole(member, project, value as "manager" | "member")} className="tf-team-role-select" /><button className="tf-icon-button" aria-label={`Remove ${member.name} from ${project.name}`} disabled={busy} onClick={() => void remove(member, project)}><Trash2 size={14} /></button></div>}</div>)}</div></article>)}</div>}
          </section>
        </div>
      </main>
      {showInvite && <div className="tf-team-modal-backdrop" role="presentation"><form className="tf-team-modal tf-glass-card" onSubmit={(event) => void invite(event)}><div className="tf-team-modal-heading"><div><div className="tf-section-kicker">COLLABORATION</div><h2>Invite a member</h2><p>They will receive the invitation in TeamForge.</p></div><button type="button" className="tf-icon-button" aria-label="Close invite dialog" onClick={() => setShowInvite(false)}><X size={18} /></button></div><label className="tf-team-field"><span>Project</span><StyledSelect ariaLabel="Invitation project" value={inviteProject} options={[{ value: "", label: "Select a project", disabled: true }, ...manageableProjects.map((project) => ({ value: String(project.id), label: project.name }))]} onChange={setInviteProject} /></label><label className="tf-team-field"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="colleague@example.com" required /></label><div className="tf-team-modal-actions"><button type="button" className="tf-secondary-button" onClick={() => setShowInvite(false)}>Cancel</button><button type="submit" className="tf-primary-button" disabled={busy}>{busy ? "Sending..." : <><Check size={16} />Send invitation</>}</button></div></form></div>}
    </div>
  );
}
