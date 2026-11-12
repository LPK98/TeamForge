import { AlertCircle, ArrowLeft, Check, LogOut, Palette, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { NotificationBell } from "../components/NotificationBell";
import { WorkspaceSidebar } from "../components/WorkspaceSidebar";
import { useAuth } from "../contexts/auth-context";
import { getAuthErrorMessage } from "./auth-errors";
import { applyTheme, getThemePreference, type ThemePreference } from "../theme";
import "./AccountPages.css";

export default function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<ThemePreference>(() => getThemePreference());
  const [loggingOut, setLoggingOut] = useState(false);

  const changeTheme = (preference: ThemePreference) => {
    setTheme(preference);
    applyTheme(preference);
    setError("");
    setNotice("Theme preference saved.");
  };

  const signOut = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't sign you out."));
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="tf-app">
      <WorkspaceSidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} onNotice={setNotice} />
      <main className="tf-account-page">
        <div className="tf-account-container">
          <header className="tf-account-header"><div><Link className="tf-account-back" to="/"><ArrowLeft size={16} />Dashboard</Link><div className="tf-section-kicker">WORKSPACE</div><h1>Settings</h1><p>Review workspace preferences and account security information.</p></div><NotificationBell /></header>
          {error && <p className="tf-account-alert" role="alert"><AlertCircle size={16} />{error}</p>}
          {notice && <p className="tf-account-success" role="status"><Check size={16} />{notice}</p>}
          <section className="tf-settings-grid">
            <article className="tf-account-card tf-glass-card"><div className="tf-account-card-heading"><div><div className="tf-section-kicker">APPEARANCE</div><h2>Theme preference</h2><p>Choose how TeamForge should look on this device.</p></div><Palette size={20} /></div><div className="tf-theme-options" role="group" aria-label="Theme preference">{(["system", "light", "dark"] as const).map((option) => <button key={option} type="button" className={`tf-theme-option ${theme === option ? "active" : ""}`} onClick={() => changeTheme(option)} aria-pressed={theme === option}>{option[0].toUpperCase() + option.slice(1)}</button>)}</div><div className="tf-settings-status"><span className="tf-settings-dot" />{theme === "system" ? "Following system appearance" : `${theme[0].toUpperCase() + theme.slice(1)} theme active`}</div><p className="tf-settings-muted">Your preference is saved in this browser and applies across TeamForge.</p></article>
            <article className="tf-account-card tf-glass-card"><div className="tf-account-card-heading"><div><div className="tf-section-kicker">SECURITY</div><h2>Session information</h2><p>Your session uses a protected Sanctum bearer token.</p></div><ShieldCheck size={20} /></div><div className="tf-settings-status"><span className="tf-settings-dot" />Authenticated session active</div><p className="tf-settings-muted">Sign out when you finish working on a shared device.</p><button className="tf-secondary-button tf-settings-logout" type="button" onClick={() => void signOut()} disabled={loggingOut}><LogOut size={15} />{loggingOut ? "Signing out..." : "Sign out"}</button></article>
          </section>
        </div>
      </main>
    </div>
  );
}
