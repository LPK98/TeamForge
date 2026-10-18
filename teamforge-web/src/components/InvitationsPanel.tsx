import { Check, Mail, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { collaborationApi, type ProjectInvitation } from "../api/collaboration.api";
import { getAuthErrorMessage } from "../pages/auth-errors";

export function InvitationsPanel() {
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setInvitations(await collaborationApi.invitations());
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't load your invitations."));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const respond = async (invitation: ProjectInvitation, accepted: boolean) => {
    setBusyId(invitation.id);
    try {
      if (accepted) await collaborationApi.acceptInvitation(invitation.id);
      else await collaborationApi.rejectInvitation(invitation.id);
      await load();
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't process that invitation."));
    } finally {
      setBusyId(null);
    }
  };

  if (!error && invitations.filter((invitation) => invitation.status === "pending").length === 0) return null;

  return <section className="tf-invitations-panel tf-glass-card" aria-labelledby="invitations-heading"><div className="tf-project-section-heading"><div><div className="tf-section-kicker">INBOX</div><h2 id="invitations-heading">Project invitations</h2><p>Review collaboration requests sent to you.</p></div><Mail size={20} /></div>{error && <p className="tf-project-alert" role="alert">{error}</p>}<div className="tf-invitation-list">{invitations.filter((invitation) => invitation.status === "pending").map((invitation) => <div className="tf-invitation-row" key={invitation.id}><div><strong>{invitation.project?.name ?? "Project invitation"}</strong><span>Expires {new Date(invitation.expires_at).toLocaleDateString()}</span></div><div><button className="tf-icon-button" aria-label={`Accept invitation to ${invitation.project?.name ?? "project"}`} disabled={busyId === invitation.id} onClick={() => void respond(invitation, true)}><Check size={15} /></button><button className="tf-icon-button" aria-label={`Reject invitation to ${invitation.project?.name ?? "project"}`} disabled={busyId === invitation.id} onClick={() => void respond(invitation, false)}><X size={15} /></button></div></div>)}</div></section>;
}
