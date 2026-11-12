import { describe, expect, it } from "vitest";
import { VIEW_STORAGE_KEY, VIEWS, parseView, viewInitScript } from "./view";

describe("parseView", () => {
  it("keeps the three stored views", () => {
    expect(parseView("auto")).toBe("auto");
    expect(parseView("desktop")).toBe("desktop");
    expect(parseView("mobile")).toBe("mobile");
  });

  it("falls back to automatic when nothing is stored", () => {
    expect(parseView(null)).toBe("auto");
    expect(parseView(undefined)).toBe("auto");
  });

  it("falls back to automatic for any other value", () => {
    expect(parseView("")).toBe("auto");
    expect(parseView("DESKTOP")).toBe("auto");
    expect(parseView("tablet")).toBe("auto");
  });
});

describe("view storage", () => {
  it("stores the choice under vuelto-view", () => {
    expect(VIEW_STORAGE_KEY).toBe("vuelto-view");
  });

  it("offers automatic first, then desktop, then mobile", () => {
    expect(VIEWS).toEqual(["auto", "desktop", "mobile"]);
  });
});

describe("viewInitScript", () => {
  function run(stored: string | null, throws = false) {
    const root = { dataset: {} as Record<string, string> };
    const storage = {
      getItem(key: string) {
        if (throws) throw new Error("blocked");
        return key === VIEW_STORAGE_KEY ? stored : null;
      },
    };
    new Function("document", "localStorage", viewInitScript)({ documentElement: root }, storage);
    return root;
  }

  it("applies the stored desktop or mobile view before paint", () => {
    expect(run("desktop").dataset.view).toBe("desktop");
    expect(run("mobile").dataset.view).toBe("mobile");
  });

  it("applies automatic when the stored value is missing or invalid", () => {
    expect(run(null).dataset.view).toBe("auto");
    expect(run("auto").dataset.view).toBe("auto");
    expect(run("tablet").dataset.view).toBe("auto");
  });

  it("applies automatic when storage is unavailable", () => {
    expect(run("desktop", true).dataset.view).toBe("auto");
  });
});
