import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { projectsApi, type Project } from "../api/projects.api";
import type { GitHubRepository } from "../api/github.api";

export function GitHubImportModal({ repository, onClose, onImport }: { repository: GitHubRepository; onClose: () => void; onImport: (projectId: number) => Promise<void> }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { void projectsApi.list().then(setProjects).catch(() => setError("Unable to load your projects.")).finally(() => setLoading(false)); }, []);
  const submit = async () => { if (!projectId) return; setSaving(true); setError(""); try { await onImport(Number(projectId)); } catch { setError("Unable to import this repository."); } finally { setSaving(false); } };
  return <div className="tf-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="tf-modal tf-glass-card" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <div className="tf-modal-heading"><div><div className="tf-section-kicker">IMPORT REPOSITORY</div><h2 id="import-title">{repository.full_name}</h2></div><button className="tf-icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      <p className="tf-modal-copy">Choose a project to associate with this GitHub repository.</p>
      {error && <p className="tf-github-error">{error}</p>}
      <label className="tf-github-field"><span>TeamForge project</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={loading}><option value="">{loading ? "Loading projects..." : "Select a project"}</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <div className="tf-modal-actions"><button className="tf-secondary-button" onClick={onClose}>Cancel</button><button className="tf-primary-button" disabled={!projectId || saving} onClick={() => void submit()}>{saving ? "Importing..." : "Import repository"}</button></div>
    </div>
  </div>;
}
