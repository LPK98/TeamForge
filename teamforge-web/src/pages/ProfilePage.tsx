import { AlertCircle, ArrowLeft, Camera, Check, Mail, Trash2, Upload, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { NotificationBell } from "../components/NotificationBell";
import { UserAvatar } from "../components/UserAvatar";
import { WorkspaceSidebar } from "../components/WorkspaceSidebar";
import { useAuth } from "../contexts/auth-context";
import { getAuthErrorMessage } from "./auth-errors";
import "./AccountPages.css";

export default function ProfilePage() {
  const { user, updateUser, uploadProfilePhoto, removeProfilePhoto } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    setError("");
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Enter your full name.");
      return;
    }
    if (trimmedName.length > 255) {
      setError("Full name must be 255 characters or fewer.");
      return;
    }
    setSaving(true);
    try {
      await updateUser(trimmedName);
      setName(trimmedName);
      setNotice("Your profile was updated.");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't update your profile."));
    } finally {
      setSaving(false);
    }
  };

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const photo = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError("");
    setNotice("");
    if (!photo) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(photo.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (photo.size > 5 * 1024 * 1024) {
      setError("Profile pictures must be 5 MB or smaller.");
      return;
    }
    setSelectedPhoto(photo);
    setPreviewUrl(URL.createObjectURL(photo));
  };

  const uploadPhoto = async () => {
    if (!selectedPhoto) return;
    setPhotoBusy(true);
    setPhotoProgress(0);
    setError("");
    setNotice("");
    try {
      await uploadProfilePhoto(selectedPhoto, setPhotoProgress);
      setSelectedPhoto(null);
      setPreviewUrl(null);
      setNotice("Your profile picture was updated.");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't upload that picture."));
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    setError("");
    setNotice("");
    try {
      await removeProfilePhoto();
      setNotice("Your profile picture was removed.");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, "We couldn't remove your picture."));
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <div className="tf-app">
      <WorkspaceSidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} onNotice={setError} />
      <main className="tf-account-page">
        <div className="tf-account-container">
          <header className="tf-account-header">
            <div><Link className="tf-account-back" to="/"><ArrowLeft size={16} />Dashboard</Link><div className="tf-section-kicker">ACCOUNT</div><h1>Profile</h1><p>Manage the name and account details used across TeamForge.</p></div>
            <NotificationBell />
          </header>
          {error && <p className="tf-account-alert" role="alert"><AlertCircle size={16} />{error}</p>}
          {notice && <p className="tf-account-success" role="status"><Check size={16} />{notice}</p>}
          <section className="tf-account-grid">
            <div className="tf-account-identity tf-glass-card">
              <div className="tf-photo-preview">{previewUrl ? <img src={previewUrl} alt="Selected profile preview" /> : <UserAvatar name={user?.name ?? ""} avatarUrl={user?.avatar_url} size="large" />}<span className="tf-photo-camera" aria-hidden="true"><Camera size={14} /></span></div>
              <h2>{user?.name || "Team member"}</h2><p>{user?.email}</p><span>Personal account</span>
              <input ref={fileInputRef} className="tf-visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} />
              <div className="tf-photo-actions"><button className="tf-secondary-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={photoBusy}><Upload size={15} />{user?.avatar_url ? "Change photo" : "Upload photo"}</button>{user?.avatar_url && !selectedPhoto && <button className="tf-danger-button" type="button" onClick={() => void removePhoto()} disabled={photoBusy}><Trash2 size={15} />Remove</button>}</div>
              {selectedPhoto && <div className="tf-photo-selected"><strong>{selectedPhoto.name}</strong><span>{photoBusy ? `Uploading ${photoProgress}%` : "Ready to upload"}</span><button className="tf-primary-button" type="button" onClick={() => void uploadPhoto()} disabled={photoBusy}>{photoBusy ? `${photoProgress}%` : "Save photo"}</button></div>}
              <small className="tf-photo-help">JPG, PNG, or WebP up to 5 MB.</small>
            </div>
            <form className="tf-account-card tf-glass-card" onSubmit={(event) => void submit(event)}>
              <div className="tf-account-card-heading"><div><div className="tf-section-kicker">PERSONAL DETAILS</div><h2>Your information</h2><p>Only your display name can be changed here.</p></div><UserRound size={20} /></div>
              <label className="tf-account-field"><span>Full name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={255} autoComplete="name" required /></label>
              <label className="tf-account-field"><span>Email address</span><span className="tf-account-readonly"><Mail size={15} />{user?.email}<small>Email changes are not available yet.</small></span></label>
              <div className="tf-account-actions"><button className="tf-primary-button" type="submit" disabled={saving}>{saving ? "Saving..." : <><Check size={16} />Save changes</>}</button></div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
