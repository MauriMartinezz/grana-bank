import { describe, expect, it } from "vitest";
import { movementSource } from "./movement-source";

describe("movementSource", () => {
  it("names the card by its last 4 digits", () => {
    expect(movementSource({ account: { currency: "ARS" }, card: { last4: "8845" } })).toBe(
      "Tarjeta terminada en 8845",
    );
  });

  it("names the account when the movement has no card", () => {
    expect(movementSource({ account: { currency: "ARS" }, card: null })).toBe("Cuenta en pesos");
    expect(movementSource({ account: { currency: "USD" }, card: null })).toBe("Cuenta en dólares");
  });
});
