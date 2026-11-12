import { describe, expect, it } from "vitest";
import {
  BALANCE_MASK,
  BALANCE_STORAGE_KEY,
  balanceInitScript,
  parseBalanceHidden,
} from "./balance-privacy";

describe("parseBalanceHidden", () => {
  it("hides only when the device stored the choice", () => {
    expect(parseBalanceHidden("hidden")).toBe(true);
    expect(parseBalanceHidden(null)).toBe(false);
    expect(parseBalanceHidden("shown")).toBe(false);
    expect(parseBalanceHidden("HIDDEN")).toBe(false);
  });

  it("masks the balance with five asterisks", () => {
    expect(BALANCE_MASK).toBe("*****");
    expect(BALANCE_STORAGE_KEY).toBe("vuelto-balance");
  });
});

describe("balanceInitScript", () => {
  function run(stored: string | null, throws = false) {
    const root = { dataset: {} as Record<string, string> };
    const storage = {
      getItem(key: string) {
        if (throws) throw new Error("blocked");
        return key === BALANCE_STORAGE_KEY ? stored : null;
      },
    };
    new Function("document", "localStorage", balanceInitScript)({ documentElement: root }, storage);
    return root;
  }

  it("hides a hidden balance before the first paint", () => {
    expect(run("hidden").dataset.balance).toBe("hidden");
  });

  it("shows it when nothing valid is stored or storage is blocked", () => {
    expect(run(null).dataset.balance).toBe("shown");
    expect(run("other").dataset.balance).toBe("shown");
    expect(run("hidden", true).dataset.balance).toBe("shown");
  });
});
