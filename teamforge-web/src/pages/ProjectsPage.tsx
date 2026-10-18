import { AlertCircle, ArrowLeft, CalendarDays, Check, ChevronDown, Edit3, FolderKanban, ListTodo, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { projectsApi, type Project, type ProjectPayload, type ProjectStatus } from "../api/projects.api";
import { getAuthErrorMessage } from "./auth-errors";
import "./ProjectsPage.css";

const statuses: Array<{ value: ProjectStatus; label: string }> = [
  { value: "planning", label: "Planning" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
];

const emptyForm: ProjectPayload = {
  name: "",
  description: "",
  status: "planning",
  start_date: "",
  due_date: "",
};

function statusLabel(status: ProjectStatus): string {
  return statuses.find((option) => option.value === status)?.label ?? status;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No date set";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function projectToForm(project: Project): ProjectPayload {
  return {
    name: project.name,
    description: project.description ?? "",
    status: project.status,
    start_date: project.start_date ?? "",
    due_date: project.due_date ?? "",
  };
}

function ProjectForm({
  initialValue,
  isSaving,
  onCancel,
  onSubmit,
}: {
  initialValue: ProjectPayload;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (payload: ProjectPayload) => Promise<void>;
}) {
  const [form, setForm] = useState(initialValue);
  const [validationError, setValidationError] = useState("");

  const updateField = (field: keyof ProjectPayload, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    if (!form.name.trim()) {
      setValidationError("Enter a project name.");
      return;
    }

    if (form.start_date && form.due_date && form.due_date < form.start_date) {
      setValidationError("The due date cannot be before the start date.");
      return;
    }

    await onSubmit({ ...form, name: form.name.trim(), description: form.description.trim() });
  };

  return (
    <form className="tf-project-form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="tf-project-form-heading">
        <div>
          <div className="tf-section-kicker">PROJECT DETAILS</div>
          <h2>{initialValue.name ? "Edit project" : "Create a project"}</h2>
        </div>
        <button type="button" className="tf-icon-button" aria-label="Close form" onClick={onCancel}><X size={18} /></button>
      </div>

      {validationError && <p className="tf-project-alert" role="alert"><AlertCircle size={16} />{validationError}</p>}

      <label className="tf-project-field">
        <span>Project name</span>
        <input value={form.name} onChange={(event) => updateField("name", event.target.value)} maxLength={255} required autoFocus />
      </label>
      <label className="tf-project-field">
        <span>Description</span>
        <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={4} maxLength={5000} />
      </label>
      <div className="tf-project-form-grid">
        <label className="tf-project-field">
          <span>Status</span>
          <span className="tf-project-select-wrap">
            <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
            <ChevronDown size={16} aria-hidden="true" />
          </span>
        </label>
        <label className="tf-project-field">
          <span>Start date</span>
          <input type="date" value={form.start_date} onChange={(event) => updateField("start_date", event.target.value)} />
        </label>
        <label className="tf-project-field">
          <span>Due date</span>
          <input type="date" value={form.due_date} onChange={(event) => updateField("due_date", event.target.value)} />
        </label>
      </div>
      <div className="tf-project-form-actions">
        <button type="button" className="tf-secondary-button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="tf-primary-button" disabled={isSaving}>{isSaving ? "Saving..." : <><Check size={16} />Save project</>}</button>
      </div>
    </form>
  );
}

function ProjectsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formValue, setFormValue] = useState<ProjectPayload>(emptyForm);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isMounted = true;

    void Promise.resolve().then(() => {
      if (!isMounted) return;
      setIsLoading(true);
      setError("");

      const load = projectId
        ? projectsApi.get(Number(projectId)).then((project) => {
            if (isMounted) setSelectedProject(project);
          })
        : projectsApi.list().then((items) => {
            if (isMounted) setProjects(items);
          });

      void load.catch((requestError: unknown) => {
        if (isMounted) setError(getAuthErrorMessage(requestError, "We couldn't load your projects. Please try again."));
      }).finally(() => {
        if (isMounted) setIsLoading(false);
      });
    });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const filteredProjects = useMemo(() => projects.filter((project) => {
    const matchesSearch = `${project.name} ${project.description ?? ""}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (statusFilter === "all" || project.status === statusFilter);
  }), [projects, searchTerm, statusFilter]);

  const openCreate = () => {
    setError("");
    setEditingProjectId(null);
    setFormValue(emptyForm);
    setShowForm(true);
  };

  const openEdit = (project: Project) => {
    setError("");
    setEditingProjectId(project.id);
    setFormValue(projectToForm(project));
    setShowForm(true);
  };

  const handleSave = async (payload: ProjectPayload) => {
    setIsSaving(true);
    setError("");

    try {
      if (editingProjectId !== null) {
        const updated = await projectsApi.update(editingProjectId, payload);
        setSelectedProject(updated);
        setProjects((current) => current.map((project) => project.id === updated.id ? updated : project));
        setNotice("Project updated successfully.");
      } else {
        const created = await projectsApi.create(payload);
        setProjects((current) => [created, ...current]);
        setNotice("Project created successfully.");
      }
      setShowForm(false);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't save the project. Please check the details and try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Delete "${project.name}"? This action cannot be undone.`)) return;
    setIsDeleting(true);
    setError("");

    try {
      await projectsApi.remove(project.id);
      if (projectId) {
        navigate("/projects", { replace: true });
        setSelectedProject(null);
      }
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setNotice("Project deleted successfully.");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't delete the project. Please try again."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (projectId) {
    return (
      <main className="tf-projects-page">
        <div className="tf-projects-orb tf-projects-orb-one" aria-hidden="true" />
        <div className="tf-projects-container">
          <Link className="tf-project-back" to="/projects"><ArrowLeft size={16} />Back to projects</Link>
          {isLoading && <div className="tf-project-state">Loading project...</div>}
          {error && <p className="tf-project-alert" role="alert"><AlertCircle size={16} />{error}</p>}
          {selectedProject && !showForm && (
            <section className="tf-project-detail tf-glass-card">
              <div className="tf-project-detail-heading">
                <div className="tf-project-detail-title"><span className="tf-project-large-icon"><FolderKanban size={24} /></span><div><div className="tf-section-kicker">PROJECT</div><h1>{selectedProject.name}</h1></div></div>
                <span className={`tf-project-status status-${selectedProject.status}`}><span />{statusLabel(selectedProject.status)}</span>
              </div>
              <p className="tf-project-description">{selectedProject.description || "No description provided."}</p>
              <div className="tf-project-dates"><span><CalendarDays size={16} />Starts {formatDate(selectedProject.start_date)}</span><span><CalendarDays size={16} />Due {formatDate(selectedProject.due_date)}</span></div>
              <div className="tf-project-detail-note"><span><ListTodo size={16} />{selectedProject.tasks_count ?? 0} total tasks · {selectedProject.completed_tasks_count ?? 0} completed · {selectedProject.progress ?? 0}% complete</span><Link className="tf-text-link" to={`/tasks?project_id=${selectedProject.id}`}>View project tasks <span aria-hidden="true">→</span></Link></div>
              <div className="tf-project-form-actions"><button className="tf-secondary-button" onClick={() => openEdit(selectedProject)}><Edit3 size={16} />Edit project</button><button className="tf-danger-button" disabled={isDeleting} onClick={() => void handleDelete(selectedProject)}><Trash2 size={16} />{isDeleting ? "Deleting..." : "Delete project"}</button></div>
            </section>
          )}
          {showForm && <ProjectForm initialValue={formValue} isSaving={isSaving} onCancel={() => setShowForm(false)} onSubmit={handleSave} />}
        </div>
      </main>
    );
  }

  return (
    <main className="tf-projects-page">
      <div className="tf-projects-orb tf-projects-orb-one" aria-hidden="true" />
      <div className="tf-projects-orb tf-projects-orb-two" aria-hidden="true" />
      <div className="tf-projects-container">
        <header className="tf-projects-header"><div><Link className="tf-project-back" to="/"><ArrowLeft size={16} />Dashboard</Link><div className="tf-section-kicker">WORKSPACE</div><h1>Projects</h1><p>Organize the work your team is building together.</p></div><button className="tf-primary-button" onClick={openCreate}><Plus size={17} />New project</button></header>
        {notice && <div className="tf-project-notice" role="status">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={16} /></button></div>}
        {error && <p className="tf-project-alert" role="alert"><AlertCircle size={16} />{error}</p>}
        {showForm && <ProjectForm initialValue={formValue} isSaving={isSaving} onCancel={() => setShowForm(false)} onSubmit={handleSave} />}
        {!showForm && <><div className="tf-project-toolbar"><label className="tf-project-search"><Search size={17} /><input aria-label="Search projects" placeholder="Search projects..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></label><label className="tf-project-filter"><span className="sr-only">Filter by status</span><select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | ProjectStatus)}><option value="all">All statuses</option>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><ChevronDown size={16} /></label></div>
          {isLoading && <div className="tf-project-state">Loading projects...</div>}
          {!isLoading && filteredProjects.length === 0 && <div className="tf-project-empty tf-glass-card"><FolderKanban size={28} /><h2>{projects.length === 0 ? "No projects yet" : "No matching projects"}</h2><p>{projects.length === 0 ? "Create your first project to get your workspace moving." : "Try a different search or status filter."}</p>{projects.length === 0 && <button className="tf-primary-button" onClick={openCreate}><Plus size={17} />Create project</button>}</div>}
          <div className="tf-project-grid">{filteredProjects.map((project) => <article key={project.id} className="tf-project-card tf-glass-card"><div className="tf-project-card-top"><span className="tf-project-large-icon"><FolderKanban size={20} /></span><span className={`tf-project-status status-${project.status}`}><span />{statusLabel(project.status)}</span></div><h2>{project.name}</h2><p>{project.description || "No description provided."}</p><div className="tf-project-card-meta"><span><CalendarDays size={14} />{formatDate(project.due_date)}</span><span><ListTodo size={14} />{project.tasks_count ?? 0} tasks · {project.progress ?? 0}%</span></div><div className="tf-project-card-actions"><Link className="tf-text-link" to={`/projects/${project.id}`}>View details <span aria-hidden="true">→</span></Link><button className="tf-icon-button" aria-label={`Edit ${project.name}`} onClick={() => { openEdit(project); navigate(`/projects/${project.id}`); }}><Edit3 size={16} /></button></div></article>)}</div>
        </>}
      </div>
    </main>
  );
}

export default ProjectsPage;
