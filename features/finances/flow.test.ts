import { describe, expect, it } from "vitest";
import { MovementType } from "@/generated/prisma/enums";
import { moneyFlow } from "./flow";

describe("moneyFlow", () => {
  it.each([
    ["SENT", "expense"],
    ["SUBSCRIPTION", "expense"],
    ["TOP_UP", "expense"],
    ["SERVICE_PAYMENT", "expense"],
    ["RECEIVED", "income"],
    ["EXCHANGE", "conversion"],
  ] as const)("classifies %s as %s", (type, flow) => {
    expect(moneyFlow(type)).toBe(flow);
  });

  it("counts every other type as money going out", () => {
    const others = Object.values(MovementType).filter((type) => type !== "RECEIVED" && type !== "EXCHANGE");
    expect(others.map(moneyFlow)).toEqual(others.map(() => "expense"));
  });
});
