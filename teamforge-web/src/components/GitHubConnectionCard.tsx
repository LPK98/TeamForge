import { GitBranch, Link2, LoaderCircle, Unlink } from "lucide-react";
import { useEffect, useState } from "react";
import { githubApi, type GitHubStatus } from "../api/github.api";

export function GitHubConnectionCard({ onChange }: { onChange?: (status: GitHubStatus) => void }) {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try { setStatus(await githubApi.status()); } catch { setError("Unable to check your GitHub connection."); }
  };
  useEffect(() => { void Promise.resolve().then(() => load()); }, []);

  const connect = async () => {
    setBusy(true); setError("");
    try {
      const url = await githubApi.authorizationUrl();
      if (url) window.location.assign(url); else setError("GitHub did not return a connection URL.");
    } catch { setError("Unable to start GitHub authorization."); } finally { setBusy(false); }
  };
  const disconnect = async () => {
    setBusy(true); setError("");
    try { await githubApi.disconnect(); const next = { connected: false }; setStatus(next); onChange?.(next); }
    catch { setError("Unable to disconnect GitHub."); } finally { setBusy(false); }
  };

  return <section className="tf-github-connection tf-glass-card">
    <div className="tf-github-connection-icon"><GitBranch size={24} /></div>
    <div className="tf-github-connection-copy">
      <div className="tf-section-kicker">GITHUB INTEGRATION</div>
      <h2>{status?.connected ? `Connected as ${status.account?.login ?? "GitHub user"}` : "Connect your GitHub account"}</h2>
      <p>{status?.connected ? "Your repositories are ready to browse and import into a project." : "Bring your repositories into TeamForge without leaving your workspace."}</p>
      {error && <small className="tf-github-error">{error}</small>}
    </div>
    <button className={status?.connected ? "tf-secondary-button" : "tf-primary-button"} disabled={busy || status === null} onClick={() => void (status?.connected ? disconnect() : connect())}>
      {busy ? <LoaderCircle className="tf-spin" size={16} /> : status?.connected ? <Unlink size={16} /> : <Link2 size={16} />}
      {busy ? "Working..." : status?.connected ? "Disconnect" : "Connect GitHub"}
    </button>
  </section>;
}
