import { describe, expect, it } from "vitest";
import { confirmationPath, formPathFor, readTopUpConfirmation } from "./confirmation";

const KEY = "0b7c3a52-5a0e-4c8e-9c39-2a6f1a7d9e10";
const SUBE = "4f7d2c1e-0000-4000-8000-000000000001";
const CARD = "4f7d2c1e-0000-4000-8000-000000000002";

const base = {
  kind: "SUBE",
  provider: "SUBE",
  target: SUBE,
  amount: "150000",
  card: CARD,
  key: KEY,
};

describe("confirmationPath", () => {
  it("carries every value and the key in the URL", () => {
    expect(
      confirmationPath(
        { kind: "PHONE", provider: "CLARO", target: "1112345678", amountCents: 10000, cardId: CARD },
        KEY,
      ),
    ).toBe(
      `/recargas/confirmar?kind=PHONE&provider=CLARO&target=1112345678&amount=10000&card=${CARD}&key=${KEY}`,
    );
  });
});

describe("readTopUpConfirmation", () => {
  it("reads a complete URL and lower-cases the key", () => {
    expect(readTopUpConfirmation({ ...base, key: KEY.toUpperCase() })).toEqual({
      kind: "SUBE",
      provider: "SUBE",
      target: SUBE,
      amountCents: 150000,
      cardId: CARD,
      idempotencyKey: KEY,
    });
  });

  it("adds a key when it is missing or malformed, keeping the rest", () => {
    for (const key of [undefined, "nope"]) {
      expect(readTopUpConfirmation({ ...base, key }, () => KEY)).toEqual({
        redirectTo: `/recargas/confirmar?kind=SUBE&provider=SUBE&target=${SUBE}&amount=150000&card=${CARD}&key=${KEY}`,
      });
    }
  });

  it.each([
    [{ kind: "GAS" }, "/recargas"],
    [{ kind: undefined }, "/recargas"],
    [{ amount: "9999" }, `/recargas/sube/${SUBE}`],
    [{ amount: "5000001" }, `/recargas/sube/${SUBE}`],
    [{ amount: "1e5" }, `/recargas/sube/${SUBE}`],
    [{ provider: "CLARO" }, `/recargas/sube/${SUBE}`],
    [{ card: "../x" }, `/recargas/sube/${SUBE}`],
    [{ target: "a b" }, "/recargas/sube"],
    [{ kind: "PHONE", provider: "CLARO", target: "12" }, "/recargas/celular"],
    [{ kind: "PHONE", provider: "SUBE", target: "1112345678" }, "/recargas/celular"],
    [{ kind: "DIRECTV", provider: "DIRECTV", target: "1234567" }, "/recargas/directv"],
  ])("sends %j back to its form", (overrides, redirectTo) => {
    expect(readTopUpConfirmation({ ...base, ...overrides })).toEqual({ redirectTo });
  });
});

describe("formPathFor", () => {
  it("points each kind to its form", () => {
    expect(formPathFor("SUBE", SUBE)).toBe(`/recargas/sube/${SUBE}`);
    expect(formPathFor("SUBE")).toBe("/recargas/sube");
    expect(formPathFor("PHONE")).toBe("/recargas/celular");
    expect(formPathFor("DIRECTV")).toBe("/recargas/directv");
  });
});
