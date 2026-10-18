import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

export interface StyledSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface StyledSelectProps {
  value: string;
  options: StyledSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function StyledSelect({ value, options, onChange, ariaLabel, placeholder = "Select an option", disabled = false, className = "" }: StyledSelectProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const selectFocused = () => {
    const option = options[focusedIndex];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setFocusedIndex(selectedIndex);
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      let next = focusedIndex;
      do {
        next = (next + direction + options.length) % options.length;
      } while (options[next]?.disabled && next !== focusedIndex);
      setFocusedIndex(next);
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectFocused();
    }
  };

  return (
    <div className={`tf-styled-select ${className}`} ref={rootRef}>
      <button
        type="button"
        className={`tf-styled-select-trigger ${selected ? "has-value" : ""}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => { setFocusedIndex(selectedIndex); setOpen((current) => !current); }}
        onKeyDown={handleKeyDown}
      >
        <span>{selected?.label ?? placeholder}</span>
        <ChevronDown className={open ? "tf-styled-select-chevron-open" : ""} size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="tf-styled-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              className={`tf-styled-select-option ${index === focusedIndex ? "focused" : ""}`}
              key={option.value}
              onMouseEnter={() => setFocusedIndex(index)}
              onClick={() => {
                if (!option.disabled) {
                  onChange(option.value);
                  setOpen(false);
                }
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
