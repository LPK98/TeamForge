import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, Zap } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import { getAuthErrorMessage } from "./auth-errors";
import "./Auth.css";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

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
    <main className="tf-auth-page">
      <div className="tf-auth-orb tf-auth-orb-one" aria-hidden="true" />
      <div className="tf-auth-orb tf-auth-orb-two" aria-hidden="true" />
      <section className="tf-auth-shell" aria-labelledby="login-title">
        <div className="tf-auth-intro">
          <Link className="tf-auth-brand" to="/" aria-label="TeamForge home">
            <span className="tf-auth-brand-mark"><Zap size={22} fill="currentColor" /></span>
            TeamForge
          </Link>
          <div className="tf-auth-intro-copy">
            <p className="tf-auth-eyebrow">YOUR WORKSPACE, IN SYNC</p>
            <h1>Build great work together.</h1>
            <p>Bring projects, people, and progress into one clear workspace.</p>
          </div>
          <div className="tf-auth-proof">
            <strong>Crystal-clear collaboration</strong>
            Everything your team needs to keep momentum moving forward.
          </div>
        </div>

        <div className="tf-auth-form-panel">
          <header className="tf-auth-form-header">
            <h2 id="login-title">Welcome back</h2>
            <p>Sign in to continue to your TeamForge workspace.</p>
          </header>

          <form className="tf-auth-form" onSubmit={handleSubmit} noValidate>
            {error && <div className="tf-auth-alert" role="alert"><AlertCircle size={16} /> <span>{error}</span></div>}
            {success && <p className="tf-auth-success" role="status">{success}</p>}

            <div className="tf-auth-field">
              <label htmlFor="login-email">Email address</label>
              <input id="login-email" className="tf-auth-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>

            <div className="tf-auth-field">
              <label htmlFor="login-password">Password</label>
              <div className="tf-auth-input-wrap">
                <input id="login-password" className="tf-auth-input has-toggle" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <button className="tf-auth-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button className="tf-auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><LoaderCircle className="tf-auth-spinner" size={16} /> Signing in...</> : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="tf-auth-switch">New to TeamForge? <Link to="/register">Create an account</Link></p>
        </div>
      </section>
    </main>
  );
}

export default Login;
