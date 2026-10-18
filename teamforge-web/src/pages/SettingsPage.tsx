import { ArrowLeft, Check, Palette, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { NotificationBell } from "../components/NotificationBell";
import { WorkspaceSidebar } from "../components/WorkspaceSidebar";
import "./AccountPages.css";

export default function SettingsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");

  return (
    <div className="tf-app">
      <WorkspaceSidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} onNotice={setNotice} />
      <main className="tf-account-page">
        <div className="tf-account-container">
          <header className="tf-account-header"><div><Link className="tf-account-back" to="/"><ArrowLeft size={16} />Dashboard</Link><div className="tf-section-kicker">WORKSPACE</div><h1>Settings</h1><p>Review workspace preferences and account security information.</p></div><NotificationBell /></header>
          {notice && <p className="tf-account-success" role="status"><Check size={16} />{notice}</p>}
          <section className="tf-settings-grid">
            <article className="tf-account-card tf-glass-card"><div className="tf-account-card-heading"><div><div className="tf-section-kicker">APPEARANCE</div><h2>Theme preference</h2><p>TeamForge follows your operating system appearance preference.</p></div><Palette size={20} /></div><div className="tf-settings-status"><span className="tf-settings-dot" />System appearance active</div><p className="tf-settings-muted">Dark and light themes are provided automatically by your browser and operating system. A manual theme override is not configured.</p></article>
            <article className="tf-account-card tf-glass-card"><div className="tf-account-card-heading"><div><div className="tf-section-kicker">SECURITY</div><h2>Session information</h2><p>Your session uses a protected Sanctum bearer token.</p></div><ShieldCheck size={20} /></div><div className="tf-settings-status"><span className="tf-settings-dot" />Authenticated session active</div><p className="tf-settings-muted">Use the logout control in the sidebar when you finish working on a shared device.</p></article>
          </section>
        </div>
      </main>
    </div>
  );
}
