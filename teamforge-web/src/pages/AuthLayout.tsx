import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./Auth.css";

interface AuthLayoutProps {
  titleId: string;
  headline: string;
  lede: string;
  children: ReactNode;
  variant?: "split" | "compact";
}

function AuthLayout({ titleId, headline, lede, children, variant = "split" }: AuthLayoutProps) {
  return (
    <main className="tf-auth-page">
      <div className="tf-auth-bg" aria-hidden="true">
        <span className="tf-auth-orb tf-auth-orb-one" />
        <span className="tf-auth-orb tf-auth-orb-two" />
        <span className="tf-auth-grid" />
        <span className="tf-auth-dots" />
      </div>

      <section className={`tf-auth-shell tf-auth-shell-${variant}`} aria-labelledby={titleId}>
        <div className="tf-auth-intro">
          <Link className="tf-auth-brand" to="/" aria-label="TeamForge home">
            <span className="tf-auth-brand-mark">
              <img className="tf-auth-brand-logo" src="/teamforge-logo.png" alt="" />
            </span>
            TeamForge
          </Link>

          <div className="tf-auth-intro-copy">
            <h1>{headline}</h1>
            <p>{lede}</p>
          </div>

        </div>

        <div className="tf-auth-form-panel">{children}</div>
      </section>
    </main>
  );
}

export default AuthLayout;
