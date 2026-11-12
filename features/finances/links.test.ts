import { describe, expect, it } from "vitest";
import type { SpendingSegment } from "./chart";
import { financesHref, groupAnchor, openGroupKeys, segmentHref } from "./links";

const PAGE = { cuenta: "ars", mes: "2026-11" };

function segment(key: string, groupKeys: string[]): SpendingSegment {
  return { key, name: key, totalCents: BigInt(1), percent: 1, width: 1, color: 0, groupKeys, showLabel: false };
}

const SEGMENTS = [
  segment("c-food", ["c-food"]),
  segment("sin-categoria", ["sin-categoria"]),
  segment("resto", ["c-gifts", "c-rent"]),
];
const GROUP_KEYS = ["c-food", "sin-categoria", "c-gifts", "c-rent", "c-budget-only"];

describe("financesHref", () => {
  it("builds the month links exactly as before", () => {
    expect(financesHref(PAGE)).toBe("/finanzas?cuenta=ars&mes=2026-11");
  });
});

describe("segmentHref", () => {
  it("keeps cuenta and mes and adds the category, jumping to its group", () => {
    expect(segmentHref(PAGE, SEGMENTS[0])).toBe(
      "/finanzas?cuenta=ars&mes=2026-11&categoria=c-food#categoria-c-food",
    );
  });

  it("links Sin categoría by its own key", () => {
    expect(segmentHref(PAGE, SEGMENTS[1])).toBe(
      "/finanzas?cuenta=ars&mes=2026-11&categoria=sin-categoria#categoria-sin-categoria",
    );
  });

  it("links Resto and jumps to the first of its groups", () => {
    expect(segmentHref(PAGE, SEGMENTS[2])).toBe(
      "/finanzas?cuenta=ars&mes=2026-11&categoria=resto#categoria-c-gifts",
    );
  });

  it("escapes keys for the URL", () => {
    expect(segmentHref({ cuenta: "usd", mes: "2026-10" }, segment("a b&c", ["a b&c"]))).toBe(
      "/finanzas?cuenta=usd&mes=2026-10&categoria=a%20b%26c#categoria-a%20b%26c",
    );
  });

  it("names the anchor each group row carries", () => {
    expect(groupAnchor("c-food")).toBe("categoria-c-food");
  });
});

describe("openGroupKeys", () => {
  it("opens the group of the chosen category", () => {
    expect(openGroupKeys("c-food", SEGMENTS, GROUP_KEYS)).toEqual(new Set(["c-food"]));
    expect(openGroupKeys("sin-categoria", SEGMENTS, GROUP_KEYS)).toEqual(new Set(["sin-categoria"]));
  });

  it("opens a group even when it has no segment, like a budget with nothing spent", () => {
    expect(openGroupKeys("c-budget-only", SEGMENTS, GROUP_KEYS)).toEqual(new Set(["c-budget-only"]));
  });

  it("opens every group folded into Resto", () => {
    expect(openGroupKeys("resto", SEGMENTS, GROUP_KEYS)).toEqual(new Set(["c-gifts", "c-rent"]));
  });

  it("opens nothing for no value, an unknown one or a repeated parameter", () => {
    expect(openGroupKeys(undefined, SEGMENTS, GROUP_KEYS)).toEqual(new Set());
    expect(openGroupKeys("c-other-user", SEGMENTS, GROUP_KEYS)).toEqual(new Set());
    expect(openGroupKeys("resto", [], GROUP_KEYS)).toEqual(new Set());
    expect(openGroupKeys(["c-food", "c-rent"], SEGMENTS, GROUP_KEYS)).toEqual(new Set());
  });
});
