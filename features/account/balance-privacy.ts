/**
 * Hiding the balance for privacy, chosen per device like the theme. The
 * choice is a `data-balance` attribute on <html>, so CSS swaps the amount for
 * the mask and the amount never shows for a moment before hiding.
 */

export const BALANCE_STORAGE_KEY = "grana-balance";
export const BALANCE_MASK = "*****";

/** Only a stored "hidden" hides the balance. */
export function parseBalanceHidden(value: string | null | undefined): boolean {
  return value === "hidden";
}

/** Runs in <head> before the first paint; it mirrors parseBalanceHidden. */
export const balanceInitScript = `(function(){var b="shown";try{if(localStorage.getItem(${JSON.stringify(
  BALANCE_STORAGE_KEY,
)})==="hidden")b="hidden"}catch(e){}document.documentElement.dataset.balance=b})()`;
