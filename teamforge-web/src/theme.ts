export type ThemePreference = "system" | "light" | "dark";

const THEME_KEY = "teamforge_theme";

export function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function applyTheme(preference: ThemePreference): void {
  if (preference === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.dataset.theme = preference;
  }
  localStorage.setItem(THEME_KEY, preference);
}
