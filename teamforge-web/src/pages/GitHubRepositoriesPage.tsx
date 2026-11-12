import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { githubApi, type GitHubRepository } from "../api/github.api";
import { GitHubConnectionCard } from "../components/GitHubConnectionCard";
import { GitHubImportModal } from "../components/GitHubImportModal";
import { GitHubRepositoryCard } from "../components/GitHubRepositoryCard";
import { WorkspaceSidebar } from "../components/WorkspaceSidebar";
import "./GitHubRepositoriesPage.css";

export default function GitHubRepositoriesPage() {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<"all" | "public" | "private">("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importRepository, setImportRepository] = useState<GitHubRepository | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const result = await githubApi.repositories({ page, per_page: 12, search: query || undefined, visibility }); setRepositories(result.repositories); setPagination(result); }
    catch { setError("We couldn't load your repositories. Connect GitHub and try again."); }
    finally { setLoading(false); }
  }, [page, query, visibility]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [load]);
  const sync = async () => {
    setSyncing(true); setError("");
    try { await githubApi.sync(); await load(); } catch { setError("Unable to sync GitHub repositories."); } finally { setSyncing(false); }
  };
  const completeImport = async (projectId: number) => {
    if (!importRepository) return;
    await githubApi.importIntoProject(importRepository.owner, importRepository.name, projectId);
    setImportRepository(null);
  };
  return <div className="tf-app"><WorkspaceSidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} onNotice={() => undefined} /><main className="tf-github-page">
    <header className="tf-github-header"><div><div className="tf-section-kicker">DEVELOPMENT TOOLS</div><h1>GitHub repositories</h1><p>Browse your GitHub repositories and connect them to TeamForge projects.</p></div><div className="tf-page-header-actions"><button className="tf-secondary-button" disabled={syncing || loading} onClick={() => void sync()}><RefreshCw className={syncing ? "tf-spin" : ""} size={15} />{syncing ? "Syncing..." : "Sync repositories"}</button><button className="tf-icon-button" onClick={() => void load()} aria-label="Refresh repositories"><RefreshCw size={17} /></button></div></header>
    <GitHubConnectionCard />
    <div className="tf-github-toolbar"><label className="tf-github-search"><Search size={16} /><input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search repositories" /></label><select className="tf-github-filter" value={visibility} onChange={(event) => { setPage(1); setVisibility(event.target.value as typeof visibility); }}><option value="all">All repositories</option><option value="public">Public only</option><option value="private">Private only</option></select></div>
    <div className="tf-github-list-heading"><div><h2>Repositories</h2><span>{pagination.total} repositories</span></div></div>
    {error && <div className="tf-github-state tf-github-alert"><AlertCircle size={17} />{error}</div>}
    {loading ? <div className="tf-github-state">Loading repositories...</div> : !error && repositories.length === 0 ? <div className="tf-github-state"><h2>No repositories found</h2><p>Try a different search or visibility filter.</p></div> : <div className="tf-github-grid">{repositories.map((repository) => <GitHubRepositoryCard key={repository.id} repository={repository} onImport={setImportRepository} />)}</div>}
    <div className="tf-github-pagination"><button className="tf-secondary-button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={15} />Previous</button><span>Page {page} of {pagination.last_page}</span><button className="tf-secondary-button" disabled={page >= pagination.last_page || loading} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight size={15} /></button></div>
    {importRepository && <GitHubImportModal repository={importRepository} onClose={() => setImportRepository(null)} onImport={completeImport} />}
  </main></div>;
}
