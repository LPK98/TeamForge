import { AlertCircle, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";
import AuthLayout from "./AuthLayout";
import PasswordField from "./PasswordField";
import { getAuthErrorMessage } from "./auth-errors";

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"] as const;

/** Frontend-only hint. The backend remains the source of truth for password rules. */
function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 14) score += 1;
  return password.length < 8 ? Math.min(score, 1) : score;
}

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const strength = getPasswordStrength(password);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

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

    if (!acceptedTerms) {
      setError("Accept the Terms of Service and Privacy Policy to continue.");
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
    <AuthLayout
      titleId="register-title"
      headline="Make space for your best work."
      lede="Start a focused workspace for the projects and people that matter."
      variant="compact"
    >
      <header className="tf-auth-form-header">
        <h2 id="register-title">Create your account</h2>
        <p>Set up your workspace access in a few quick steps.</p>
      </header>

      <form className="tf-auth-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="tf-auth-alert" role="alert">
            <AlertCircle size={16} /> <span>{error}</span>
          </div>
        )}

        <div className="tf-auth-field">
          <label htmlFor="register-name">Full name</label>
          <input
            id="register-name"
            className="tf-auth-input"
            type="text"
            autoComplete="name"
            placeholder="Enter your full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="tf-auth-field">
          <label htmlFor="register-email">Email address</label>
          <input
            id="register-email"
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

        <div>
          <PasswordField
            id="register-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="Create a password"
            disabled={isSubmitting}
            describedBy="register-strength"
          />
          <div className="tf-auth-strength" id="register-strength" data-level={strength} aria-live="polite">
            <div className="tf-auth-strength-bars" aria-hidden="true">
              <i /><i /><i /><i />
            </div>
            <span>{password ? `Password strength: ${STRENGTH_LABELS[strength]}` : "Use 8+ characters with a mix of letters, numbers, and symbols."}</span>
          </div>
        </div>

        <PasswordField
          id="register-confirm-password"
          label="Confirm password"
          value={passwordConfirmation}
          onChange={setPasswordConfirmation}
          autoComplete="new-password"
          placeholder="Repeat your password"
          noun="password confirmation"
          disabled={isSubmitting}
        />

        <label className="tf-auth-check">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            disabled={isSubmitting}
          />
          <span>I agree to the Terms of Service and Privacy Policy.</span>
        </label>

        <button className="tf-auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <LoaderCircle className="tf-auth-spinner" size={16} /> Creating account...
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="tf-auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

export default Register;
