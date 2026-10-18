import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

function AuthLoading() {
  return (
    <main className="tf-auth-loading" aria-live="polite">
      <div className="tf-auth-loading-spinner" aria-hidden="true" />
      <p>Restoring your TeamForge session...</p>
    </main>
  );
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoading />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export function PublicOnlyRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoading />;
  }

  return isAuthenticated ? <Navigate to="/" replace /> : children;
}
