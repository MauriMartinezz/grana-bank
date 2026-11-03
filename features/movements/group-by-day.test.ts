import { describe, expect, it } from "vitest";
import { addDays, dayKey, startOfDay } from "./day";
import { groupByDay } from "./group-by-day";

// Buenos Aires is UTC-3: 03:00 UTC is midnight there.
const NOW = new Date("2026-11-03T15:00:00Z");

function item(id: string, iso: string) {
  return { id, occurredAt: new Date(iso) };
}

function summary(groups: ReturnType<typeof groupByDay<{ id: string; occurredAt: Date }>>) {
  return groups.map((group) => [group.label, group.items.map((i) => i.id)]);
}

describe("dayKey", () => {
  it("returns the calendar day in Buenos Aires, not in UTC", () => {
    expect(dayKey(new Date("2026-11-03T02:59:00Z"))).toBe("2026-11-02");
    expect(dayKey(new Date("2026-11-03T03:00:00Z"))).toBe("2026-11-03");
  });
});

describe("addDays", () => {
  it("moves across month and year boundaries", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("startOfDay", () => {
  it("is midnight in Buenos Aires as a UTC instant", () => {
    expect(startOfDay("2026-11-03").toISOString()).toBe("2026-11-03T03:00:00.000Z");
  });
});

describe("groupByDay", () => {
  it("returns no groups for an empty list", () => {
    expect(groupByDay([], NOW)).toEqual([]);
  });

  it("labels today and yesterday in Buenos Aires around midnight", () => {
    const groups = groupByDay(
      [
        item("today-early", "2026-11-03T03:01:00Z"), // 00:01 on the 3rd
        item("yesterday-late", "2026-11-03T02:59:00Z"), // 23:59 on the 2nd
        item("yesterday-early", "2026-11-02T03:00:00Z"), // 00:00 on the 2nd
        item("before", "2026-11-02T02:59:00Z"), // 23:59 on the 1st
      ],
      NOW,
    );
    expect(summary(groups)).toEqual([
      ["Hoy", ["today-early"]],
      ["Ayer", ["yesterday-late", "yesterday-early"]],
      ["1 de noviembre", ["before"]],
    ]);
  });

  it("uses Buenos Aires for today too: just after midnight UTC is still the day before", () => {
    const justAfterUtcMidnight = new Date("2026-11-04T01:00:00Z"); // 22:00 on the 3rd
    const groups = groupByDay([item("a", "2026-11-03T23:30:00Z")], justAfterUtcMidnight);
    expect(summary(groups)).toEqual([["Hoy", ["a"]]]);
  });

  it("adds the year only for another year", () => {
    const groups = groupByDay(
      [item("this-year", "2026-10-30T15:00:00Z"), item("last-year", "2025-12-31T15:00:00Z")],
      NOW,
    );
    expect(summary(groups)).toEqual([
      ["30 de octubre", ["this-year"]],
      ["31 de diciembre de 2025", ["last-year"]],
    ]);
  });

  it("keeps the input order of groups and of the rows inside each group", () => {
    const groups = groupByDay(
      [
        item("b", "2026-11-03T12:00:00Z"),
        item("a", "2026-11-03T12:00:00Z"),
        item("c", "2026-11-01T12:00:00Z"),
        item("d", "2026-11-03T10:00:00Z"),
      ],
      NOW,
    );
    expect(summary(groups)).toEqual([
      ["Hoy", ["b", "a", "d"]],
      ["1 de noviembre", ["c"]],
    ]);
    expect(groups.map((g) => g.day)).toEqual(["2026-11-03", "2026-11-01"]);
  });
});
