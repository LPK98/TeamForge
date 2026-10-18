import { Activity, CheckCircle2, CircleHelp, FolderKanban, LayoutDashboard, LogOut, Settings, Users, X, Zap } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import { UserAvatar } from "./UserAvatar";
import "./WorkspaceSidebar.css";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "My Tasks", href: "/tasks", icon: CheckCircle2 },
  { label: "Team Members", href: "/team-members", icon: Users },
  { label: "Activity", href: "/activity", icon: Activity },
];

export function WorkspaceSidebar({
  menuOpen,
  setMenuOpen,
  onNotice,
}: {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  onNotice: (message: string) => void;
}) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
  };

  return (
    <>
      <aside className={`tf-sidebar ${menuOpen ? "tf-sidebar-open" : ""}`}>
        <div className="tf-brand">
          <div className="tf-brand-mark"><Zap size={22} fill="currentColor" /></div>
          <div><h1>TeamForge</h1><p>Work better together</p></div>
          <button className="tf-icon-button tf-mobile-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={19} /></button>
        </div>
        <div className="tf-workspace-label">WORKSPACE</div>
        <nav className="tf-nav" aria-label="Main navigation">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = href === "/" ? location.pathname === "/" : href.startsWith("/") && location.pathname.startsWith(href);
            return href.startsWith("/") ? (
              <Link key={label} to={href} className={`tf-nav-link ${active ? "active" : ""}`} onClick={() => setMenuOpen(false)}>
                <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              </Link>
            ) : (
              <a key={label} href={href} className="tf-nav-link">
                <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              </a>
            );
          })}
        </nav>
        <div className="tf-sidebar-spacer" />
        <div className="tf-help-card">
          <div className="tf-help-icon"><CircleHelp size={18} /></div>
          <p className="tf-help-title">Need a hand?</p>
          <p className="tf-help-copy">Keep projects organized and your team connected.</p>
          <button className="tf-help-link" onClick={() => onNotice("Help center is coming soon.")}>Visit help center <span aria-hidden="true">↗</span></button>
        </div>
        <div className="tf-profile">
          <Link className="tf-profile-main" to="/profile" onClick={() => setMenuOpen(false)} aria-label="Open your profile">
          <UserAvatar name={user?.name ?? "there"} avatarUrl={user?.avatar_url} size="small" className="tf-avatar" />
          <div className="tf-profile-copy"><p>{user?.name ?? "Team member"}</p><span>Personal account</span></div>
          </Link>
          <Link className="tf-icon-button" aria-label="Settings" to="/settings" onClick={() => setMenuOpen(false)}><Settings size={18} /></Link>
          <button className="tf-icon-button" aria-label="Log out" disabled={loggingOut} onClick={() => void handleLogout()}><LogOut size={18} /></button>
        </div>
      </aside>
      {menuOpen && <button className="tf-mobile-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    </>
  );
}
