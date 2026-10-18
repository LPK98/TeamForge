import { Bell, Check, CheckCheck, Inbox, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collaborationApi } from "../api/collaboration.api";
import { notificationsApi, type AppNotification } from "../api/notifications.api";
import { getAuthErrorMessage } from "../pages/auth-errors";
import "./NotificationBell.css";

const POLL_INTERVAL = 45_000;

function relativeTime(value: string): string {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await notificationsApi.list();
      setNotifications(result.notifications);
      setUnreadCount(result.unread_count);
      setError("");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "Notifications are temporarily unavailable."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    const interval = window.setInterval(() => void load(), POLL_INTERVAL);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [load]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const markRead = async (notification: AppNotification) => {
    if (notification.is_read) return;
    try {
      await notificationsApi.markRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item));
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't update that notification."));
    }
  };

  const respond = async (notification: AppNotification, accepted: boolean) => {
    const invitationId = notification.invitation?.id;
    if (!invitationId) return;
    setBusyId(notification.id);
    try {
      if (accepted) await collaborationApi.acceptInvitation(invitationId);
      else await collaborationApi.rejectInvitation(invitationId);
      await load();
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't process that invitation."));
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't mark all notifications as read."));
    }
  };

  const toggle = () => {
    setOpen((current) => !current);
    if (!open) void load();
  };

  return (
    <div className="tf-notification-wrap" ref={containerRef}>
      <button className={`tf-icon-button tf-notification ${open ? "is-open" : ""}`} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={open} aria-controls="notification-popover" onClick={toggle}>
        <Bell size={19} />
        {unreadCount > 0 && <span className="tf-notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && <section id="notification-popover" className="tf-notification-popover" aria-label="Notifications">
        <div className="tf-notification-heading">
          <div className="tf-notification-title"><span className="tf-notification-title-icon"><Bell size={16} /></span><div><strong>Notifications</strong><span>{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</span></div></div>
          {unreadCount > 0 && <button className="tf-notification-read-all" onClick={() => void markAllRead()}><CheckCheck size={14} />Mark all read</button>}
        </div>
        {error && <p className="tf-notification-error" role="alert">{error}</p>}
        {loading && <p className="tf-notification-state"><span className="tf-notification-spinner" />Checking for updates...</p>}
        {!loading && notifications.length === 0 && <div className="tf-notification-empty"><span><Inbox size={22} /></span><strong>Nothing new</strong><p>New project invitations will appear here.</p></div>}
        <div className="tf-notification-list">
          {notifications.map((notification) => <article className={`tf-notification-item ${notification.is_read ? "" : "is-unread"}`} key={notification.id}>
            <button className="tf-notification-content" onClick={() => { void markRead(notification); if (notification.invitation) navigate("/projects"); }}>
              <strong>{notification.title}</strong><span>{notification.message}</span><small><span className="tf-notification-project">{notification.invitation?.project_name}</span>{relativeTime(notification.created_at)}</small>
            </button>
            {notification.invitation?.status === "pending" && <div className="tf-notification-actions"><button aria-label="Accept invitation" disabled={busyId === notification.id} onClick={() => void respond(notification, true)}><Check size={14} /></button><button aria-label="Reject invitation" disabled={busyId === notification.id} onClick={() => void respond(notification, false)}><X size={14} /></button></div>}
          </article>)}
        </div>
      </section>}
    </div>
  );
}
