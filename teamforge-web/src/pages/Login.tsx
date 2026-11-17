import { AlertCircle, LoaderCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import { setToken } from "../services/api";
import AuthLayout from "./AuthLayout";
import PasswordField from "./PasswordField";
import { getAuthErrorMessage } from "./auth-errors";

const GOOGLE_REDIRECT_URL =
  import.meta.env.VITE_GOOGLE_REDIRECT_URL?.trim() ?? "";
const GITHUB_REDIRECT_URL =
  import.meta.env.VITE_GITHUB_REDIRECT_URL?.trim() ?? "";

function GoogleIcon() {
  return (
    <svg className="tf-auth-social-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z" />
      <path fill="#34A853" d="M12 21.6c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.55 0-4.71-1.72-5.49-4.04H3.27v2.53A9.74 9.74 0 0 0 12 21.6Z" />
      <path fill="#FBBC05" d="M6.51 13.67a5.86 5.86 0 0 1 0-3.34V7.8H3.27a9.75 9.75 0 0 0 0 8.4l3.24-2.53Z" />
      <path fill="#EA4335" d="M12 6.29c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.84 3.37 14.63 2.4 12 2.4a9.74 9.74 0 0 0-8.73 5.4l3.24 2.53C7.29 8.01 9.45 6.29 12 6.29Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="tf-auth-social-icon tf-auth-github-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.94 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.44 11.44 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .3Z" />
    </svg>
  );
}

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false);
  const [isGitHubRedirecting, setIsGitHubRedirecting] = useState(false);
  const [error, setError] = useState(() => new URLSearchParams(window.location.search).get("oauth_error") ?? "");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("oauth_token");

    if (oauthToken) {
      setToken(oauthToken);
      window.location.replace("/");
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate("/");
    } catch (submissionError) {
      setError(getAuthErrorMessage(submissionError, "We couldn’t sign you in. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    if (isSubmitting || isGoogleRedirecting || isGitHubRedirecting) return;

    if (!GOOGLE_REDIRECT_URL) {
      setError("Google sign-in is not configured.");
      return;
    }

    setIsGoogleRedirecting(true);
    window.location.assign(GOOGLE_REDIRECT_URL);
  };

  const handleGitHubLogin = () => {
    if (isSubmitting || isGoogleRedirecting || isGitHubRedirecting) return;

    if (!GITHUB_REDIRECT_URL) {
      setError("GitHub sign-in is not configured.");
      return;
    }

    setIsGitHubRedirecting(true);
    window.location.assign(GITHUB_REDIRECT_URL);
  };

  return (
    <AuthLayout
      titleId="login-title"
      headline="Build great work together."
      lede="Bring projects, people, and progress into one clear workspace."
      variant="compact"
    >
      <header className="tf-auth-form-header">
        <h2 id="login-title">Welcome back</h2>
        <p>Sign in to continue to your TeamForge workspace.</p>
      </header>

      <form className="tf-auth-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="tf-auth-alert" role="alert">
            <AlertCircle size={16} /> <span>{error}</span>
          </div>
        )}

        <div className="tf-auth-field">
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            className="tf-auth-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="Enter your password"
          disabled={isSubmitting}
        />

        <button className="tf-auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <LoaderCircle className="tf-auth-spinner" size={16} /> Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <div className="tf-auth-social" aria-label="Social sign-in options">
        <div className="tf-auth-social-divider"><span>or continue with</span></div>
        <div className="tf-auth-social-options">
          <button
            className="tf-auth-social-button"
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting || isGoogleRedirecting || isGitHubRedirecting}
            aria-busy={isGoogleRedirecting}
          >
            <GoogleIcon />
            {isGoogleRedirecting ? "Connecting..." : "Google"}
          </button>
          <button
            className="tf-auth-social-button"
            type="button"
            onClick={handleGitHubLogin}
            disabled={isSubmitting || isGoogleRedirecting || isGitHubRedirecting}
            aria-busy={isGitHubRedirecting}
          >
            <GitHubIcon />
            {isGitHubRedirecting ? "Connecting..." : "GitHub"}
          </button>
        </div>
      </div>

      <p className="tf-auth-switch">
        New to TeamForge? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
