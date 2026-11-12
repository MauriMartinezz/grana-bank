"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { VIEWS, VIEW_STORAGE_KEY, type View, parseView } from "@/features/profile/view";

const LABELS: Record<View, string> = { auto: "Automática", desktop: "Escritorio", mobile: "Móvil" };
const CHANGE_EVENT = "vuelto-view-change";

// The choice for this visit when storage is blocked.
let unsavedView: View | null = null;

function readView(): View {
  try {
    return parseView(localStorage.getItem(VIEW_STORAGE_KEY));
  } catch {
    return unsavedView ?? "auto";
  }
}

function applyView(view: View) {
  document.documentElement.dataset.view = view;
}

function chooseView(view: View) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Storage blocked: the view still applies for this visit.
    unsavedView = view;
  }
  applyView(view);
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
 * Keeps <html data-view> in line with the stored choice. The inline script in
 * the root layout sets it before paint; this re-applies it after a dev remount
 * resets <html> and when another tab changes the choice.
 */
export function ViewSync() {
  const view = useSyncExternalStore(subscribe, readView, () => null);
  useLayoutEffect(() => {
    if (view) applyView(view);
  }, [view]);
  return null;
}

/** "Automática | Escritorio | Móvil" for this device: applies at once and persists. */
export function ViewToggle() {
  // The server does not know the device's choice, so nothing is pressed until hydration.
  const current = useSyncExternalStore(subscribe, readView, () => null);

  return (
    <div role="group" aria-label="Vista" className="flex gap-1 rounded-full bg-canvas p-1">
      {VIEWS.map((view) => (
        <button
          key={view}
          type="button"
          aria-pressed={current === view}
          onClick={() => chooseView(view)}
          className={`min-h-11 rounded-full px-2.5 font-serif text-sm whitespace-nowrap ${
            current === view ? "bg-garnet-fill text-white" : "text-muted"
          }`}
        >
          {LABELS[view]}
        </button>
      ))}
    </div>
  );
}
