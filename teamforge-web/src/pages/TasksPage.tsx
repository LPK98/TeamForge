import { AlertCircle, ArrowLeft, CalendarDays, Check, ChevronDown, Edit3, ListTodo, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { projectsApi, type Project } from "../api/projects.api";
import { tasksApi, type Task, type TaskPayload, type TaskPriority, type TaskStatus } from "../api/tasks.api";
import { getAuthErrorMessage } from "./auth-errors";
import "./TasksPage.css";

const statuses: Array<{ value: TaskStatus; label: string }> = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];
const priorities: Array<{ value: TaskPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];
const emptyForm: TaskPayload = { project_id: 0, title: "", description: "", status: "todo", priority: "medium", due_date: "" };

function labelFor(options: Array<{ value: string; label: string }>, value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)) : "No due date";
}

function taskToForm(task: Task): TaskPayload {
  return { project_id: task.project_id, title: task.title, description: task.description ?? "", status: task.status, priority: task.priority, due_date: task.due_date ?? "" };
}

function TaskForm({
  projects,
  initialValue,
  isSaving,
  onCancel,
  onSubmit,
}: {
  projects: Project[];
  initialValue: TaskPayload;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (payload: TaskPayload) => Promise<void>;
}) {
  const [form, setForm] = useState(initialValue);
  const [validationError, setValidationError] = useState("");

  const update = (field: keyof TaskPayload, value: string) => setForm((current) => ({ ...current, [field]: field === "project_id" ? Number(value) : value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");
    if (!form.project_id) return setValidationError("Select a project.");
    if (!form.title.trim()) return setValidationError("Enter a task title.");
    await onSubmit({ ...form, title: form.title.trim(), description: form.description.trim() });
  };

  return (
    <form className="tf-task-form" onSubmit={(event) => void submit(event)}>
      <div className="tf-task-form-heading"><div><div className="tf-section-kicker">TASK DETAILS</div><h2>{initialValue.title ? "Edit task" : "Create a task"}</h2></div><button type="button" className="tf-icon-button" aria-label="Close form" onClick={onCancel}><X size={18} /></button></div>
      {validationError && <p className="tf-task-alert" role="alert"><AlertCircle size={16} />{validationError}</p>}
      <label className="tf-task-field"><span>Task title</span><input value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={255} required autoFocus /></label>
      <label className="tf-task-field"><span>Description</span><textarea value={form.description} onChange={(event) => update("description", event.target.value)} maxLength={5000} rows={4} /></label>
      <div className="tf-task-form-grid">
        <label className="tf-task-field"><span>Project</span><span className="tf-task-select-wrap"><select value={form.project_id || ""} onChange={(event) => update("project_id", event.target.value)} required><option value="" disabled>Select a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><ChevronDown size={16} /></span></label>
        <label className="tf-task-field"><span>Status</span><span className="tf-task-select-wrap"><select value={form.status} onChange={(event) => update("status", event.target.value)}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><ChevronDown size={16} /></span></label>
        <label className="tf-task-field"><span>Priority</span><span className="tf-task-select-wrap"><select value={form.priority} onChange={(event) => update("priority", event.target.value)}>{priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}</select><ChevronDown size={16} /></span></label>
        <label className="tf-task-field"><span>Due date</span><input type="date" value={form.due_date} onChange={(event) => update("due_date", event.target.value)} /></label>
      </div>
      <div className="tf-task-form-actions"><button type="button" className="tf-secondary-button" onClick={onCancel}>Cancel</button><button type="submit" className="tf-primary-button" disabled={isSaving || projects.length === 0}>{isSaving ? "Saving..." : <><Check size={16} />Save task</>}</button></div>
    </form>
  );
}

function TasksPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState(searchParams.get("project_id") ?? "all");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formValue, setFormValue] = useState(emptyForm);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    void Promise.all([projectsApi.list(), taskId ? tasksApi.get(Number(taskId)) : tasksApi.list()])
      .then(([projectItems, taskData]) => {
        if (!mounted) return;
        setProjects(projectItems);
        if (taskId) setSelectedTask(taskData as Task);
        else setTasks(taskData as Task[]);
      })
      .catch((requestError: unknown) => {
        if (mounted) setError(getAuthErrorMessage(requestError, "We couldn't load your tasks. Please try again."));
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, [taskId]);

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const textMatches = `${task.title} ${task.description ?? ""} ${task.project?.name ?? ""}`.toLowerCase().includes(searchTerm.toLowerCase());
    return textMatches && (projectFilter === "all" || task.project_id === Number(projectFilter)) && (statusFilter === "all" || task.status === statusFilter) && (priorityFilter === "all" || task.priority === priorityFilter);
  }), [tasks, searchTerm, projectFilter, statusFilter, priorityFilter]);

  const openCreate = () => { setEditingTaskId(null); setFormValue({ ...emptyForm, project_id: projects[0]?.id ?? 0 }); setShowForm(true); setError(""); };
  const openEdit = (task: Task) => { setEditingTaskId(task.id); setFormValue(taskToForm(task)); setShowForm(true); setError(""); };

  const save = async (payload: TaskPayload) => {
    setIsSaving(true);
    try {
      const saved = editingTaskId === null ? await tasksApi.create(payload) : await tasksApi.update(editingTaskId, payload);
      if (editingTaskId === null) setTasks((current) => [saved, ...current]);
      else { setTasks((current) => current.map((task) => task.id === saved.id ? saved : task)); setSelectedTask(saved); }
      setShowForm(false);
      setNotice(editingTaskId === null ? "Task created successfully." : "Task updated successfully.");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't save the task. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (task: Task) => {
    if (!window.confirm(`Delete "${task.title}"? This action cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await tasksApi.remove(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      if (taskId) { setSelectedTask(null); navigate("/tasks", { replace: true }); }
      setNotice("Task deleted successfully.");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't delete the task. Please try again."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (taskId) {
    return <main className="tf-tasks-page"><div className="tf-tasks-container"><Link className="tf-task-back" to="/tasks"><ArrowLeft size={16} />Back to tasks</Link>{isLoading && <div className="tf-task-state">Loading task...</div>}{error && <p className="tf-task-alert" role="alert"><AlertCircle size={16} />{error}</p>}{selectedTask && !showForm && <section className="tf-task-detail tf-glass-card"><div className="tf-task-detail-heading"><div><div className="tf-section-kicker">TASK</div><h1>{selectedTask.title}</h1></div><span className={`tf-task-badge priority-${selectedTask.priority}`}>{labelFor(priorities, selectedTask.priority)}</span></div><p>{selectedTask.description || "No description provided."}</p><div className="tf-task-detail-meta"><span><ListTodo size={15} />{selectedTask.project?.name ?? "Project"}</span><span><CalendarDays size={15} />{formatDate(selectedTask.due_date)}</span><span className={`tf-task-badge status-${selectedTask.status}`}>{labelFor(statuses, selectedTask.status)}</span></div><div className="tf-task-form-actions"><button className="tf-secondary-button" onClick={() => openEdit(selectedTask)}><Edit3 size={16} />Edit task</button><button className="tf-danger-button" disabled={isDeleting} onClick={() => void remove(selectedTask)}><Trash2 size={16} />{isDeleting ? "Deleting..." : "Delete task"}</button></div></section>}{showForm && <TaskForm projects={projects} initialValue={formValue} isSaving={isSaving} onCancel={() => setShowForm(false)} onSubmit={save} />}</div></main>;
  }

  return <main className="tf-tasks-page"><div className="tf-tasks-container"><header className="tf-tasks-header"><div><Link className="tf-task-back" to="/"><ArrowLeft size={16} />Dashboard</Link><div className="tf-section-kicker">WORKSPACE</div><h1>Tasks</h1><p>Turn project plans into focused, trackable work.</p></div><button className="tf-primary-button" onClick={openCreate} disabled={projects.length === 0}><Plus size={17} />New task</button></header>{notice && <div className="tf-task-notice" role="status">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={16} /></button></div>}{error && <p className="tf-task-alert" role="alert"><AlertCircle size={16} />{error}</p>}{showForm && <TaskForm projects={projects} initialValue={formValue} isSaving={isSaving} onCancel={() => setShowForm(false)} onSubmit={save} />}{!showForm && <><div className="tf-task-toolbar"><label className="tf-task-search"><Search size={17} /><input aria-label="Search tasks" placeholder="Search tasks..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></label><label className="tf-task-filter"><span className="sr-only">Project</span><select aria-label="Filter by project" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="all">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label className="tf-task-filter"><span className="sr-only">Status</span><select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | TaskStatus)}><option value="all">All statuses</option>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label><label className="tf-task-filter"><span className="sr-only">Priority</span><select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as "all" | TaskPriority)}><option value="all">All priorities</option>{priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}</select></label></div>{isLoading && <div className="tf-task-state">Loading tasks...</div>}{!isLoading && visibleTasks.length === 0 && <div className="tf-task-empty tf-glass-card"><ListTodo size={28} /><h2>{tasks.length === 0 ? "No tasks yet" : "No matching tasks"}</h2><p>{tasks.length === 0 ? "Create a task from one of your projects to get started." : "Try a different search or filter."}</p>{tasks.length === 0 && projects.length > 0 && <button className="tf-primary-button" onClick={openCreate}><Plus size={17} />Create task</button>}</div>}<div className="tf-task-grid">{visibleTasks.map((task) => <article className="tf-task-card tf-glass-card" key={task.id}><div className="tf-task-card-top"><span className={`tf-task-badge priority-${task.priority}`}>{labelFor(priorities, task.priority)}</span><span className={`tf-task-badge status-${task.status}`}>{labelFor(statuses, task.status)}</span></div><h2>{task.title}</h2><p>{task.description || "No description provided."}</p><div className="tf-task-card-meta"><span><ListTodo size={14} />{task.project?.name ?? "Project"}</span><span><CalendarDays size={14} />{formatDate(task.due_date)}</span></div><div className="tf-task-card-actions"><Link className="tf-text-link" to={`/tasks/${task.id}`}>View details <span aria-hidden="true">→</span></Link><button className="tf-icon-button" aria-label={`Edit ${task.title}`} onClick={() => { openEdit(task); navigate(`/tasks/${task.id}`); }}><Edit3 size={16} /></button></div></article>)}</div></>}</div></main>;
}

export default TasksPage;
