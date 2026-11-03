/**
 * The layout, chosen per device in Perfil. Automatic (the default) shows the
 * desktop layout from the `lg` breakpoint and the mobile one below it. The
 * choice is a `data-view` attribute on <html>, read by the `desktop:` variant
 * in globals.css, so the layout never flashes and the server render is the same.
 */
export const VIEWS = ["auto", "desktop", "mobile"] as const;

export type View = (typeof VIEWS)[number];

/** The localStorage key that keeps this device's choice. */
export const VIEW_STORAGE_KEY = "grana-view";

/** Reads a stored value: anything other than a known view means automatic. */
export function parseView(value: string | null | undefined): View {
  return value === "desktop" || value === "mobile" ? value : "auto";
}

/**
 * Runs in <head> before the first paint. It mirrors parseView and falls back
 * to automatic when storage is blocked.
 */
export const viewInitScript = `(function(){var v="auto";try{var s=localStorage.getItem(${JSON.stringify(
  VIEW_STORAGE_KEY,
)});if(s==="desktop"||s==="mobile")v=s}catch(e){}document.documentElement.dataset.view=v})()`;
