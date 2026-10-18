import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyledSelect } from "./StyledSelect";

export interface ActivityFilterOption {
  value: string;
  label: string;
}

interface ActivityFiltersProps {
  projects: ActivityFilterOption[];
  eventTypes: ActivityFilterOption[];
  projectId: string;
  type: string;
  from: string;
  to: string;
  onProjectChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onInvalidDate: (message: string) => void;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string): string {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date) : "Select date";
}

interface DatePickerProps {
  label: string;
  value: string;
  min?: string;
  onChange: (value: string) => void;
  onInvalidDate: (message: string) => void;
}

function DatePicker({ label, value, min, onChange, onInvalidDate }: DatePickerProps) {
  const selectedDate = parseDate(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => selectedDate ?? new Date());
  const rootRef = useRef<HTMLDivElement>(null);
  const today = dateValue(new Date());
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstDay = monthStart.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const calendarDays = useMemo(() => Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? new Date(month.getFullYear(), month.getMonth(), day) : null;
  }), [daysInMonth, firstDay, month]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const chooseDate = (date: Date) => {
    const nextValue = dateValue(date);
    if (min && nextValue < min) {
      onInvalidDate("The end date cannot be earlier than the start date.");
      return;
    }
    onInvalidDate("");
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div className="tf-activity-date-picker" ref={rootRef}>
      <button
        type="button"
        className={`tf-activity-date-control ${value ? "has-value" : ""}`}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => { setMonth(selectedDate ?? new Date()); setOpen((current) => !current); }}
      >
        <CalendarDays size={15} aria-hidden="true" />
        <span><small>{label}</small>{formatDate(value)}</span>
      </button>
      {open && (
        <div className="tf-activity-calendar" role="dialog" aria-label={`${label} calendar`}>
          <div className="tf-activity-calendar-header">
            <button type="button" className="tf-activity-calendar-nav" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
            <strong>{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month)}</strong>
            <button type="button" className="tf-activity-calendar-nav" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
          </div>
          <div className="tf-activity-calendar-weekdays" aria-hidden="true">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="tf-activity-calendar-grid">
            {calendarDays.map((date, index) => date ? (
              <button
                type="button"
                key={dateValue(date)}
                className={`tf-activity-calendar-day ${dateValue(date) === value ? "selected" : ""} ${dateValue(date) === today ? "today" : ""}`}
                aria-label={date.toLocaleDateString()}
                aria-pressed={dateValue(date) === value}
                disabled={Boolean(min && dateValue(date) < min)}
                onClick={() => chooseDate(date)}
              >
                {date.getDate()}
              </button>
            ) : <span key={`empty-${index}`} aria-hidden="true" />)}
          </div>
          <div className="tf-activity-calendar-actions">
            <button type="button" onClick={() => { onInvalidDate(""); onChange(""); setOpen(false); }}>Clear</button>
            <button type="button" onClick={() => chooseDate(new Date())}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ActivityFilters({ projects, eventTypes, projectId, type, from, to, onProjectChange, onTypeChange, onFromChange, onToChange, onInvalidDate }: ActivityFiltersProps) {
  return (
    <div className="tf-activity-toolbar" aria-label="Activity filters">
      <StyledSelect ariaLabel="Filter by project" value={projectId} options={[{ value: "", label: "All projects" }, ...projects]} onChange={onProjectChange} className="tf-activity-filter-select" />
      <StyledSelect ariaLabel="Filter by activity type" value={type} options={[{ value: "", label: "All activity" }, ...eventTypes]} onChange={onTypeChange} className="tf-activity-filter-select" />
      <DatePicker label="From" value={from} onChange={onFromChange} onInvalidDate={onInvalidDate} />
      <DatePicker label="To" value={to} min={from} onChange={onToChange} onInvalidDate={onInvalidDate} />
    </div>
  );
}
