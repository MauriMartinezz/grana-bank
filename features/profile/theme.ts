/** The color themes, chosen per device in Perfil. Light is the default. */
export const THEMES = ["light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

/** The localStorage key that keeps this device's choice. */
export const THEME_STORAGE_KEY = "vuelto-theme";

/** Reads a stored value: anything other than a known theme means light. */
export function parseTheme(value: string | null | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}

/**
 * Runs in <head> before the first paint, so a stored dark choice never flashes
 * light. It mirrors parseTheme and falls back to light when storage is blocked.
 * `color-scheme` follows from the attribute in globals.css.
 */
export const themeInitScript = `(function(){var t="light";try{if(localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})==="dark")t="dark"}catch(e){}document.documentElement.dataset.theme=t})()`;
