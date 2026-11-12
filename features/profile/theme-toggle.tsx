"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { THEMES, THEME_STORAGE_KEY, type Theme, parseTheme } from "@/features/profile/theme";

const LABELS: Record<Theme, string> = { light: "Claro", dark: "Oscuro" };
const CHANGE_EVENT = "vuelto-theme-change";

// The choice for this visit when storage is blocked.
let unsavedTheme: Theme | null = null;

function readTheme(): Theme {
  try {
    return parseTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return unsavedTheme ?? "light";
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function chooseTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the theme still applies for this visit.
    unsavedTheme = theme;
  }
  applyTheme(theme);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * Keeps <html data-theme> in line with the stored choice. The inline script in
 * the root layout sets it before paint; this re-applies it after React's dev
 * remount resets <html> and when another tab changes the choice.
 */
export function ThemeSync() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => null);
  useLayoutEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);
  return null;
}

/** "Claro | Oscuro" for this device: applies at once and persists across reloads. */
export function ThemeToggle() {
  // The server does not know the device's choice, so nothing is pressed until hydration.
  const current = useSyncExternalStore(subscribe, readTheme, () => null);

  return (
    <div role="group" aria-label="Tema" className="grid grid-cols-2 gap-1 rounded-full bg-canvas p-1">
      {THEMES.map((theme) => (
        <button
          key={theme}
          type="button"
          aria-pressed={current === theme}
          onClick={() => chooseTheme(theme)}
          className={`min-h-11 rounded-full px-4 font-serif text-sm ${
            current === theme ? "bg-garnet-fill text-white" : "text-muted"
          }`}
        >
          {LABELS[theme]}
        </button>
      ))}
    </div>
  );
}
