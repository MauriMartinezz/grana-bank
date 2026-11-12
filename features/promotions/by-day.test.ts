import { describe, expect, it } from "vitest";
import { groupByWeekday } from "./by-day";

const promo = (id: string, weekdays: number[]) => ({ id, weekdays });

describe("groupByWeekday", () => {
  it("groups Monday to Sunday with Spanish titles, skipping empty days", () => {
    const groups = groupByWeekday([promo("a", [5]), promo("b", [1]), promo("c", [7])], null);
    expect(groups.map((group) => [group.weekday, group.title])).toEqual([
      [1, "Lunes"],
      [5, "Viernes"],
      [7, "Domingo"],
    ]);
  });

  it("lists a promotion in each of its days, keeping the list order inside a day", () => {
    const groups = groupByWeekday(
      [promo("best", [2, 4]), promo("other", [2]), promo("thursday", [4])],
      null,
    );
    expect(groups.map((group) => [group.title, group.promotions.map((p) => p.id)])).toEqual([
      ["Martes", ["best", "other"]],
      ["Jueves", ["best", "thursday"]],
    ]);
  });

  it("names every weekday", () => {
    const all = groupByWeekday([promo("x", [1, 2, 3, 4, 5, 6, 7])], null);
    expect(all.map((group) => group.title)).toEqual([
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ]);
  });

  it("shows only the selected day when the list is filtered by one", () => {
    const groups = groupByWeekday([promo("a", [2, 5]), promo("b", [2])], 2);
    expect(groups.map((group) => [group.title, group.promotions.map((p) => p.id)])).toEqual([
      ["Martes", ["a", "b"]],
    ]);
  });

  it("returns no groups for no promotions", () => {
    expect(groupByWeekday([], null)).toEqual([]);
  });
});
