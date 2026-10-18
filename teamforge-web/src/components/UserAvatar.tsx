import { useState } from "react";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "small" | "medium" | "large";
  className?: string;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";
}

export function UserAvatar({ name, avatarUrl, size = "medium", className = "" }: UserAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl && avatarUrl !== failedUrl);

  return (
    <span className={`tf-user-avatar tf-user-avatar-${size} ${className}`} role="img" aria-label={`${name || "User"} profile picture`}>
      {showImage ? <img src={avatarUrl ?? undefined} alt="" onError={() => setFailedUrl(avatarUrl ?? null)} /> : initials(name)}
    </span>
  );
}
