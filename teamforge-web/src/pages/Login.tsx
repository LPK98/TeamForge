import { AlertCircle, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import AuthLayout from "./AuthLayout";
import PasswordField from "./PasswordField";
import { getAuthErrorMessage } from "./auth-errors";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
          <button className="tf-auth-social-button" type="button" disabled title="Google sign-in is coming soon">
            <span className="tf-auth-google-mark" aria-hidden="true">G</span>
            Google
          </button>
          <button className="tf-auth-social-button" type="button" disabled title="GitHub sign-in is coming soon">
            <span className="tf-auth-github-mark" aria-hidden="true">GH</span>
            GitHub
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
