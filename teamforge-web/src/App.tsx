import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  CircleHelp,
  Clock3,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Users,
  Zap,
  X,
} from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { projectsApi, type Project } from "./api/projects.api";
import { tasksApi, type Task } from "./api/tasks.api";
import { useAuth } from "./contexts/auth-context";
import "./App.css";

const navItems = [
  { label: "Dashboard", href: "#dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "My Tasks", href: "/tasks", icon: CheckCircle2 },
  { label: "Team Members", href: "#team", icon: Users },
  { label: "Activity", href: "#activity", icon: Activity },
];

function App() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void projectsApi.list()
      .then((items) => {
        if (isMounted) {
          setProjects(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setNotice("We couldn't load your projects. Open Projects to try again.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setProjectsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void tasksApi.list()
      .then((items) => {
        if (isMounted) setTasks(items);
      })
      .catch(() => {
        if (isMounted) setNotice("We couldn't load your tasks. Open Tasks to try again.");
      })
      .finally(() => {
        if (isMounted) setTasksLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleTasks = tasks.filter((task) =>
    `${task.title} ${task.project?.name ?? ""} ${task.priority}`.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const completedTaskCount = tasks.filter((task) => task.status === "completed").length;

  const handleTaskToggle = async (task: Task) => {
    const nextStatus = task.status === "completed" ? "todo" : "completed";

    try {
      const updatedTask = await tasksApi.update(task.id, {
        project_id: task.project_id,
        title: task.title,
        description: task.description ?? "",
        status: nextStatus,
        priority: task.priority,
        due_date: task.due_date ?? "",
      });
      setTasks((current) => current.map((currentTask) => currentTask.id === updatedTask.id ? updatedTask : currentTask));
    } catch {
      setNotice("We couldn't update that task. Please try again.");
    }
  };

  const handleNewProject = () => navigate("/projects");

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setNotice("You’ve been signed out locally. We couldn’t reach the server.");
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="tf-app">
      <div className="tf-orb tf-orb-one" aria-hidden="true" />
      <div className="tf-orb tf-orb-two" aria-hidden="true" />

      <aside className={`tf-sidebar ${menuOpen ? "tf-sidebar-open" : ""}`}>
        <div className="tf-brand">
          <div className="tf-brand-mark"><Zap size={22} fill="currentColor" /></div>
          <div>
            <h1>TeamForge</h1>
            <p>Work better together</p>
          </div>
          <button className="tf-icon-button tf-mobile-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={19} /></button>
        </div>

        <div className="tf-workspace-label">WORKSPACE</div>
        <nav className="tf-nav" aria-label="Main navigation">
          {navItems.map(({ label, href, icon: Icon }, index) => (
            href.startsWith("/") ? (
              <Link key={label} to={href} className="tf-nav-link" onClick={() => setMenuOpen(false)}>
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
                {label === "My Tasks" && <span className="tf-nav-count">3</span>}
              </Link>
            ) : <a key={label} href={href} className={`tf-nav-link ${index === 0 ? "active" : ""}`} onClick={() => setMenuOpen(false)}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "My Tasks" && <span className="tf-nav-count">3</span>}
            </a>
          ))}
        </nav>

        <div className="tf-sidebar-spacer" />

        <div className="tf-help-card">
          <div className="tf-help-icon"><CircleHelp size={18} /></div>
          <p className="tf-help-title">Need a hand?</p>
          <p className="tf-help-copy">Keep projects organized and your team connected.</p>
          <button className="tf-help-link" onClick={() => setNotice("Help center is coming soon.")}>Visit help center <span aria-hidden="true">↗</span></button>
        </div>

        <div className="tf-profile">
          <div className="tf-avatar">LP</div>
          <div className="tf-profile-copy">
            <p>Team Admin</p>
            <span>Workspace owner</span>
          </div>
          <button className="tf-icon-button" aria-label="Settings" onClick={() => setNotice("Workspace settings are coming soon.")}><Settings size={18} /></button>
          <button className="tf-icon-button" aria-label="Log out" onClick={() => void handleLogout()}><LogOut size={18} /></button>
        </div>
      </aside>

      {menuOpen && <button className="tf-mobile-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

      <main id="dashboard" className="tf-main">
        <header className="tf-topbar">
          <button className="tf-icon-button tf-menu-trigger" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
          <div className="tf-breadcrumb"><span>Workspace</span><span className="tf-crumb-slash">/</span><strong>Overview</strong></div>
          <div className="tf-topbar-actions">
            <label className="tf-search">
              <Search size={17} />
              <input aria-label="Search tasks" placeholder="Search tasks..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
              <kbd>⌘ K</kbd>
            </label>
            <button className="tf-icon-button tf-notification" aria-label="Notifications" onClick={() => setNotice("You're all caught up — no new notifications.")}>
              <Bell size={19} /><span />
            </button>
            <button className="tf-primary-button" onClick={handleNewProject}><Plus size={17} /><span>New project</span></button>
          </div>
        </header>

        {notice && <div className="tf-notice" role="status"><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={16} /></button></div>}

        <section className="tf-welcome">
          <div>
            <div className="tf-eyebrow"><span className="tf-live-dot" /> YOUR WORKSPACE AT A GLANCE</div>
            <h2>Good morning, Lal <span className="tf-wave" role="img" aria-label="waving hand">👋</span></h2>
            <p>Here’s what’s happening with your projects today.</p>
          </div>
          <div className="tf-date-pill"><span className="tf-date-dot" /> Monday, October 19</div>
        </section>

        <section className="tf-stats-grid" aria-label="Workspace statistics">
          {[
            { label: "Total projects", value: projectsLoading ? "—" : String(projects.length), note: "From your workspace", icon: FolderKanban, up: true },
            { label: "Active tasks", value: tasksLoading ? "—" : String(tasks.filter((task) => task.status !== "completed").length), note: `${completedTaskCount} completed`, icon: CheckCircle2, up: true },
            { label: "Team members", value: "—", note: "Team module coming soon", icon: Users, up: true },
            { label: "Hours tracked", value: "—", note: "Time tracking coming soon", icon: Clock3, up: false },
          ].map((stat, index) => (
            <article key={stat.label} className={`tf-glass-card tf-stat-card tf-stat-${index + 1}`}>
              <div className="tf-stat-top"><span>{stat.label}</span><span className="tf-stat-icon"><stat.icon size={19} /></span></div>
              <div className="tf-stat-value">{stat.value}</div>
              <div className="tf-stat-note">
                {stat.up ? <ArrowUpRight size={15} className="tf-trend-up" /> : <ArrowDownRight size={15} className="tf-trend-neutral" />}
                <span>{stat.note}</span>
              </div>
              <div className="tf-stat-glow" aria-hidden="true" />
            </article>
          ))}
        </section>

        <div className="tf-content-grid">
          <section id="projects" className="tf-glass-card tf-section-card">
            <div className="tf-section-heading">
              <div>
                <div className="tf-section-kicker">IN PROGRESS</div>
                <h3>Active projects</h3>
                <p>Keep an eye on the work moving forward.</p>
              </div>
              <Link to="/projects" className="tf-text-link">View all <span aria-hidden="true">→</span></Link>
            </div>

            <div className="tf-project-list">
              {projectsLoading && <div className="tf-empty-state">Loading projects...</div>}
              {!projectsLoading && projects.slice(0, 3).map((project) => (
                <article key={project.id} className="tf-project-item">
                  <div className="tf-project-row">
                    <div className="tf-project-symbol" style={{ "--project-color": "#60a5fa" } as CSSProperties}><FolderKanban size={18} /></div>
                    <div className="tf-project-info"><h4>{project.name}</h4><p>{project.description || "No description provided."}</p></div>
                    <span className="tf-status status-blue"><span />{project.status.replace("_", " ")}</span>
                  </div>
                  <div className="tf-progress-meta"><span>{project.due_date ? `Due ${project.due_date}` : "No due date"}</span><Link className="tf-text-link" to={`/projects/${project.id}`}>Details <span aria-hidden="true">→</span></Link></div>
                </article>
              ))}
              {!projectsLoading && projects.length === 0 && <div className="tf-empty-state">No projects yet. Create your first project from the Projects page.</div>}
            </div>
          </section>

          <section id="activity" className="tf-glass-card tf-section-card tf-activity-card">
            <div className="tf-section-heading">
              <div>
                <div className="tf-section-kicker">YOUR DAY</div>
                <h3>Focus overview</h3>
                <p>A little progress adds up.</p>
              </div>
              <div className="tf-focus-icon"><Activity size={19} /></div>
            </div>
            <div className="tf-focus-ring-wrap">
              <div className="tf-focus-ring"><div><strong>68%</strong><span>weekly focus</span></div></div>
            </div>
            <div className="tf-focus-legend">
              <div><span className="tf-legend-dot blue" />Completed work <strong>17h</strong></div>
              <div><span className="tf-legend-dot muted" />Available time <strong>8h</strong></div>
            </div>
            <div className="tf-focus-footer"><span className="tf-focus-check"><CheckCircle2 size={16} /></span><p><strong>Great momentum!</strong><br />You’re keeping your projects moving.</p></div>
          </section>
        </div>

        <section id="tasks" className="tf-glass-card tf-section-card tf-tasks-section">
          <div className="tf-section-heading">
            <div>
              <div className="tf-section-kicker">UP NEXT</div>
              <h3>Upcoming tasks</h3>
              <p>Stay on top of your next deadlines.</p>
            </div>
            <span className="tf-task-count">{visibleTasks.length} tasks</span>
          </div>
          <div className="tf-task-list">
            {tasksLoading && <div className="tf-empty-state">Loading tasks...</div>}
            {!tasksLoading && visibleTasks.map((task) => {
            const isComplete = task.status === "completed";
            return (
              <article key={task.id} className={`tf-task-item ${isComplete ? "is-complete" : ""}`}>
                <button className={`tf-task-check ${isComplete ? "checked" : ""}`} aria-label={`${isComplete ? "Mark incomplete" : "Complete"} ${task.title}`} aria-pressed={isComplete} onClick={() => void handleTaskToggle(task)}>
                  {isComplete && <CheckCircle2 size={16} />}
                </button>
                <div className="tf-task-copy"><p>{task.title}</p><span>{task.project?.name ?? "Project"}</span></div>
                <span className="tf-task-due"><Clock3 size={14} />{task.due_date ?? "No due date"}</span>
                <span className="tf-priority" style={{ "--priority-color": task.priority === "urgent" ? "#fb7185" : task.priority === "high" ? "#fbbf24" : task.priority === "low" ? "#34d399" : "#60a5fa" } as CSSProperties}><span />{task.priority}</span>
              </article>
            );
            })}
            {!tasksLoading && visibleTasks.length === 0 && <div className="tf-empty-state">{tasks.length === 0 ? "No tasks yet. Create one from the Tasks page." : `No tasks match “${searchTerm}”. Try another search.`}</div>}
          </div>
        </section>

        <footer className="tf-footer"><span>© 2026 TeamForge</span><span><span className="tf-footer-dot" /> All systems looking good</span><span>Made for teams that build together.</span></footer>
      </main>
    </div>
  );
}

export default App;
