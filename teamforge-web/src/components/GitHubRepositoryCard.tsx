import { ExternalLink, GitFork, Import, LockKeyhole, Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { GitHubRepository } from "../api/github.api";

export function GitHubRepositoryCard({ repository, onImport }: { repository: GitHubRepository; onImport?: (repository: GitHubRepository) => void }) {
  return <article className="tf-github-repository tf-glass-card">
    <div className="tf-github-repository-heading">
      <div className="tf-github-repository-mark"><span>{repository.owner.slice(0, 1).toUpperCase()}</span></div>
      <span className={`tf-github-visibility ${repository.private ? "is-private" : ""}`}>{repository.private ? <LockKeyhole size={12} /> : "Public"}</span>
    </div>
    <Link to={`/github/repositories/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`} className="tf-github-repository-name">{repository.full_name}</Link>
    <p>{repository.description || "No description provided."}</p>
    <div className="tf-github-repository-meta">
      {repository.language && <span><i className="tf-language-dot" />{repository.language}</span>}
      <span><Star size={13} />{repository.stargazers_count ?? 0}</span>
      <span><GitFork size={13} />{repository.forks_count ?? 0}</span>
      {onImport && <button className="tf-github-card-import" onClick={() => onImport(repository)}><Import size={13} />Import</button>}
      <a href={repository.html_url} target="_blank" rel="noreferrer" aria-label="Open on GitHub"><ExternalLink size={14} /></a>
    </div>
  </article>;
}
