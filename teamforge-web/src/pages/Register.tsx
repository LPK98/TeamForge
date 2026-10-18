import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, UserRound, Zap } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import { getAuthErrorMessage } from "./auth-errors";
import "./Auth.css";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    if (!trimmedName || !email.trim() || !password || !passwordConfirmation) {
      setError("Complete all fields to create your account.");
      return;
    }

    if (trimmedName.length > 255) {
      setError("Full name must be 255 characters or fewer.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: trimmedName,
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
      });
      navigate("/");
    } catch (submissionError) {
      setError(getAuthErrorMessage(submissionError, "We couldn’t create your account. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="tf-auth-page">
      <div className="tf-auth-orb tf-auth-orb-one" aria-hidden="true" />
      <div className="tf-auth-orb tf-auth-orb-two" aria-hidden="true" />
      <section className="tf-auth-shell" aria-labelledby="register-title">
        <div className="tf-auth-intro">
          <Link className="tf-auth-brand" to="/" aria-label="TeamForge home">
            <span className="tf-auth-brand-mark"><Zap size={22} fill="currentColor" /></span>
            TeamForge
          </Link>
          <div className="tf-auth-intro-copy">
            <p className="tf-auth-eyebrow">A BETTER WAY TO BUILD</p>
            <h1>Make space for your best work.</h1>
            <p>Start a focused workspace for the projects and people that matter.</p>
          </div>
          <div className="tf-auth-proof">
            <strong>One workspace, shared momentum</strong>
            Keep every deadline, update, and win visible to your team.
          </div>
        </div>

        <div className="tf-auth-form-panel">
          <header className="tf-auth-form-header">
            <h2 id="register-title">Create your account</h2>
            <p>Set up your workspace access in a few quick steps.</p>
          </header>

          <form className="tf-auth-form" onSubmit={handleSubmit} noValidate>
            {error && <div className="tf-auth-alert" role="alert"><AlertCircle size={16} /> <span>{error}</span></div>}
            {success && <p className="tf-auth-success" role="status">{success}</p>}

            <div className="tf-auth-field">
              <label htmlFor="register-name"><UserRound size={14} aria-hidden="true" />Full name</label>
              <input id="register-name" className="tf-auth-input" type="text" autoComplete="name" placeholder="Enter your full name" value={name} onChange={(event) => setName(event.target.value)} maxLength={255} required />
            </div>

            <div className="tf-auth-field">
              <label htmlFor="register-email">Email address</label>
              <input id="register-email" className="tf-auth-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>

            <div className="tf-auth-field">
              <label htmlFor="register-password">Password</label>
              <div className="tf-auth-input-wrap">
                <input id="register-password" className="tf-auth-input has-toggle" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Create a password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <button className="tf-auth-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="tf-auth-field">
              <label htmlFor="register-confirm-password">Confirm password</label>
              <div className="tf-auth-input-wrap">
                <input id="register-confirm-password" className="tf-auth-input has-toggle" type={showConfirmation ? "text" : "password"} autoComplete="new-password" placeholder="Repeat your password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required />
                <button className="tf-auth-toggle" type="button" aria-label={showConfirmation ? "Hide password confirmation" : "Show password confirmation"} onClick={() => setShowConfirmation((visible) => !visible)}>
                  {showConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button className="tf-auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><LoaderCircle className="tf-auth-spinner" size={16} /> Creating account...</> : <>Create account <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="tf-auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </section>
    </main>
  );
}

export default Register;
