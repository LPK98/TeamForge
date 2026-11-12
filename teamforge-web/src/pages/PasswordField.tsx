import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder: string;
  disabled?: boolean;
  /** Used in the toggle's accessible name, e.g. "password confirmation". */
  noun?: string;
  describedBy?: string;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  disabled,
  noun = "password",
  describedBy,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="tf-auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="tf-auth-input-wrap">
        <input
          id={id}
          className="tf-auth-input has-toggle"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-describedby={describedBy}
          required
        />
        <button
          className="tf-auth-toggle"
          type="button"
          aria-label={`${visible ? "Hide" : "Show"} ${noun}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default PasswordField;
