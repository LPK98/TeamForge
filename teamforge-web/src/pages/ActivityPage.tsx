import { Activity as ActivityIcon, CheckCircle2, ClipboardCheck, FolderKanban, Mail, RefreshCw, Shield, UserPlus, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { activitiesApi, type ActivityFilters as ActivityQueryFilters, type ActivityItem, type ActivityType } from "../api/activities.api";
import { projectsApi, type Project } from "../api/projects.api";
import { NotificationBell } from "../components/NotificationBell";
import { ActivityFilters } from "../components/ActivityFilters";
import { WorkspaceSidebar } from "../components/WorkspaceSidebar";
import { UserAvatar } from "../components/UserAvatar";
import { getAuthErrorMessage } from "./auth-errors";
import "./ActivityPage.css";

const eventTypes: Array<{ value: ActivityType; label: string }> = [
  { value: "project_created", label: "Projects created" },
  { value: "project_updated", label: "Projects updated" },
  { value: "task_created", label: "Tasks created" },
  { value: "task_updated", label: "Tasks updated" },
  { value: "task_status_changed", label: "Status changes" },
  { value: "task_completed", label: "Tasks completed" },
  { value: "task_assigned", label: "Assignments" },
  { value: "task_deleted", label: "Tasks deleted" },
  { value: "member_invited", label: "Invitations" },
  { value: "invitation_accepted", label: "Invitations accepted" },
  { value: "invitation_rejected", label: "Invitations rejected" },
  { value: "member_added", label: "Members added" },
  { value: "member_removed", label: "Members removed" },
  { value: "member_role_changed", label: "Role changes" },
];

function relativeTime(value: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function iconFor(type: ActivityType) {
  if (type.startsWith("project")) return FolderKanban;
  if (type.startsWith("task")) return type === "task_completed" ? CheckCircle2 : ClipboardCheck;
  if (type.startsWith("invitation")) return Mail;
  if (type === "member_role_changed") return Shield;
  return type === "member_invited" ? UserPlus : Users;
}

export default function ActivityPage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [type, setType] = useState<ActivityType | "">("");
  const [projectId, setProjectId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dateError, setDateError] = useState("");

  const filters = useMemo<ActivityQueryFilters>(() => ({
    project_id: projectId || undefined, type: type || undefined, from: from || undefined, to: to || undefined, page, per_page: 15,
  }), [from, page, projectId, to, type]);

  const loadProjects = useCallback(async () => {
    try { setProjects(await projectsApi.list()); } catch { setProjects([]); }
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await activitiesApi.list(filters);
      setActivities(response.data);
      setLastPage(response.last_page);
      setError("");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't load activity right now."));
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { void Promise.resolve().then(() => loadProjects()); }, [loadProjects]);
  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const updateFromDate = (value: string) => {
    updateFilter(setFrom, value);
    if (value && to && value > to) setTo(value);
  };

  return (
    <div className="tf-app">
      <WorkspaceSidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} onNotice={setError} />
      <main className="tf-activity-page">
        <div className="tf-activity-orb tf-activity-orb-one" aria-hidden="true" />
        <div className="tf-activity-container">
          <header className="tf-activity-header"><div><div className="tf-section-kicker">WORKSPACE</div><h1>Activity</h1><p>Stay up to date with changes across your projects and team.</p></div><div className="tf-page-header-actions"><NotificationBell /><button className="tf-icon-button tf-activity-refresh" aria-label="Refresh activity" title="Refresh activity" onClick={() => void load()}><RefreshCw size={17} /></button></div></header>
          {error && <p className="tf-activity-alert" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError("")}><X size={15} /></button></p>}
          <section className="tf-activity-panel tf-glass-card">
            <ActivityFilters
              projects={projects.map((project) => ({ value: String(project.id), label: project.name }))}
              eventTypes={eventTypes}
              projectId={projectId}
              type={type}
              from={from}
              to={to}
              onProjectChange={(value) => updateFilter(setProjectId, value)}
              onTypeChange={(value) => updateFilter((nextValue) => setType(nextValue as ActivityType | ""), value)}
              onFromChange={updateFromDate}
              onToChange={(value) => updateFilter(setTo, value)}
              onInvalidDate={setDateError}
            />
            {dateError && <p className="tf-activity-filter-error" role="alert">{dateError}</p>}
            {loading && <div className="tf-activity-state"><span className="tf-activity-spinner" aria-hidden="true" />Loading activity...</div>}
            {!loading && activities.length === 0 && <div className="tf-activity-empty"><span className="tf-activity-empty-icon"><ActivityIcon size={30} /></span><h2>{projectId || type || from || to ? "No matching activity" : "No activity yet"}</h2><p>{projectId || type || from || to ? "Try clearing a filter or choosing a wider date range." : "Project, task, and collaboration changes will appear here as your workspace evolves."}</p>{(projectId || type || from || to) && <button className="tf-secondary-button" onClick={() => { setProjectId(""); setType(""); setFrom(""); setTo(""); setPage(1); setDateError(""); }}>Clear filters</button>}</div>}
            {!loading && activities.length > 0 && <div className="tf-activity-list">{activities.map((item) => { const Icon = iconFor(item.type); return <article className="tf-activity-item" key={item.id}><span className="tf-activity-icon"><Icon size={17} /></span><span className="tf-activity-line" />{item.actor ? <UserAvatar name={item.actor.name} avatarUrl={item.actor.avatar_url} size="small" className="tf-activity-avatar" /> : <div className="tf-activity-avatar">SY</div>}<div className="tf-activity-copy"><p><strong>{item.actor?.name ?? "System"}</strong> {item.description}</p><div><span className="tf-activity-project" onClick={() => item.project && navigate(`/projects/${item.project.id}`)}>{item.project?.name ?? "Project unavailable"}</span><time title={new Date(item.created_at).toLocaleString()}>{relativeTime(item.created_at)}</time></div></div></article>; })}</div>}
            {!loading && error && <div className="tf-activity-retry"><button className="tf-secondary-button" onClick={() => void load()}><RefreshCw size={15} />Retry</button></div>}
            {!loading && lastPage > 1 && <div className="tf-activity-pagination"><button className="tf-secondary-button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {lastPage}</span><button className="tf-secondary-button" disabled={page >= lastPage} onClick={() => setPage((current) => current + 1)}>Next</button></div>}
          </section>
        </div>
      </main>
    </div>
  );
}
