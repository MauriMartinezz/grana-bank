import { describe, expect, it } from "vitest";
import { defaultCardId, defaultFirst } from "./default-card";

const cards = [{ id: "old" }, { id: "middle" }, { id: "new" }];

describe("defaultCardId", () => {
  it("is the chosen card when it is one of the account's", () => {
    expect(defaultCardId(cards, "middle")).toBe("middle");
  });

  it("is the oldest card when none is chosen or the chosen one is gone", () => {
    expect(defaultCardId(cards, null)).toBe("old");
    expect(defaultCardId(cards, "removed")).toBe("old");
  });

  it("is the only card, and nothing without cards", () => {
    expect(defaultCardId([{ id: "only" }], null)).toBe("only");
    expect(defaultCardId([], null)).toBeNull();
  });
});

describe("defaultFirst", () => {
  it("moves the default card first and keeps the others in order", () => {
    expect(defaultFirst(cards, "new").map((c) => c.id)).toEqual(["new", "old", "middle"]);
    expect(defaultFirst(cards, null).map((c) => c.id)).toEqual(["old", "middle", "new"]);
  });
});
