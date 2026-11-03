import { describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY, THEMES, parseTheme, themeInitScript } from "./theme";

describe("parseTheme", () => {
  it("keeps the two stored themes", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });

  it("falls back to light when nothing is stored", () => {
    expect(parseTheme(null)).toBe("light");
    expect(parseTheme(undefined)).toBe("light");
  });

  it("falls back to light for any other value", () => {
    expect(parseTheme("")).toBe("light");
    expect(parseTheme("DARK")).toBe("light");
    expect(parseTheme("blue")).toBe("light");
  });
});

describe("theme storage", () => {
  it("stores the choice under grana-theme", () => {
    expect(THEME_STORAGE_KEY).toBe("grana-theme");
  });

  it("offers light first, then dark", () => {
    expect(THEMES).toEqual(["light", "dark"]);
  });
});

describe("themeInitScript", () => {
  function run(stored: string | null, throws = false) {
    const root = { dataset: {} as Record<string, string> };
    const storage = {
      getItem(key: string) {
        if (throws) throw new Error("blocked");
        return key === THEME_STORAGE_KEY ? stored : null;
      },
    };
    new Function("document", "localStorage", themeInitScript)({ documentElement: root }, storage);
    return root;
  }

  it("applies the stored dark theme before paint", () => {
    expect(run("dark").dataset.theme).toBe("dark");
  });

  it("applies light when the stored value is missing or invalid", () => {
    expect(run(null).dataset.theme).toBe("light");
    expect(run("purple").dataset.theme).toBe("light");
  });

  it("applies light when storage is unavailable", () => {
    expect(run("dark", true).dataset.theme).toBe("light");
  });
});
