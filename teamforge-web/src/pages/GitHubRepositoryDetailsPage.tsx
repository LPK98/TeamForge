import { ArrowLeft, ExternalLink, GitFork, Import, LockKeyhole, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { githubApi, type GitHubRepository } from "../api/github.api";
import { GitHubImportModal } from "../components/GitHubImportModal";
import { WorkspaceSidebar } from "../components/WorkspaceSidebar";
import "./GitHubRepositoriesPage.css";

export default function GitHubRepositoryDetailsPage() {
  const { owner = "", name = "" } = useParams();
  const navigate = useNavigate();
  const [repository, setRepository] = useState<GitHubRepository | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { void githubApi.repository(owner, name).then(setRepository).catch(() => setError("We couldn't load this repository.")).finally(() => setLoading(false)); }, [owner, name]);
  const importRepository = async (projectId: number) => { await githubApi.importIntoProject(owner, name, projectId); setShowImport(false); setNotice("Repository imported into your project."); };
  return <div className="tf-app"><WorkspaceSidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} onNotice={() => undefined} /><main className="tf-github-page">
    <Link className="tf-github-back" to="/github/repositories"><ArrowLeft size={15} />Back to repositories</Link>
    {loading ? <div className="tf-github-state">Loading repository...</div> : error ? <div className="tf-github-state tf-github-alert">{error}</div> : repository && <section className="tf-github-detail tf-glass-card">
      <div className="tf-github-detail-heading"><div><div className="tf-github-detail-title"><div className="tf-github-repository-mark"><span>{repository.owner.slice(0, 1).toUpperCase()}</span></div><div><div className="tf-section-kicker">GITHUB REPOSITORY</div><h1>{repository.full_name}</h1></div></div><p>{repository.description || "No description provided."}</p></div><div className="tf-github-detail-actions"><a className="tf-secondary-button" href={repository.html_url} target="_blank" rel="noreferrer">Open on GitHub <ExternalLink size={14} /></a><button className="tf-primary-button" onClick={() => setShowImport(true)}><Import size={16} />Import to project</button></div></div>
      <div className="tf-github-detail-meta"><span>{repository.private ? <><LockKeyhole size={15} />Private</> : "Public"}</span><span><Star size={15} />{repository.stargazers_count ?? 0} stars</span><span><GitFork size={15} />{repository.forks_count ?? 0} forks</span><span>Default branch: <strong>{repository.default_branch || "main"}</strong></span></div>
      {notice && <p className="tf-github-success">{notice} <button onClick={() => navigate("/projects")}>View projects</button></p>}
    </section>}
    {showImport && repository && <GitHubImportModal repository={repository} onClose={() => setShowImport(false)} onImport={importRepository} />}
  </main></div>;
}
