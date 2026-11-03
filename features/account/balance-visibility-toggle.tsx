"use client";

import { useSyncExternalStore } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { BALANCE_STORAGE_KEY, parseBalanceHidden } from "./balance-privacy";

const CHANGE_EVENT = "grana-balance-change";

function readHidden() {
  // The attribute is the source of truth: the head script set it, and it keeps
  // the choice for this visit when storage is blocked.
  return document.documentElement.dataset.balance === "hidden";
}

function subscribe(onChange: () => void) {
  function sync(event: Event) {
    // Another tab changed the choice: follow it.
    if (event instanceof StorageEvent && event.key === BALANCE_STORAGE_KEY) {
      document.documentElement.dataset.balance = parseBalanceHidden(event.newValue)
        ? "hidden"
        : "shown";
    }
    onChange();
  }
  window.addEventListener("storage", sync);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", sync);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function setHidden(hidden: boolean) {
  document.documentElement.dataset.balance = hidden ? "hidden" : "shown";
  try {
    localStorage.setItem(BALANCE_STORAGE_KEY, hidden ? "hidden" : "shown");
  } catch {
    // Storage blocked: the choice still applies for this visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** An eye that hides every balance on this device, and shows it again. */
export function BalanceVisibilityToggle() {
  const hidden = useSyncExternalStore(subscribe, readHidden, () => false);
  const Icon = hidden ? EyeOffIcon : EyeIcon;

  return (
    <button
      type="button"
      onClick={() => setHidden(!hidden)}
      aria-pressed={hidden}
      aria-label={hidden ? "Mostrar saldo" : "Ocultar saldo"}
      className="-m-2.5 flex size-11 items-center justify-center rounded-full"
    >
      <Icon className="size-5" />
    </button>
  );
}
