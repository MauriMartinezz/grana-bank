import { describe, expect, it } from "vitest";
import { confirmationPath, readExchangeConfirmation } from "./confirmation";
import { MAX_EXCHANGE_USD_CENTS } from "./rate";

const KEY = "0b7d8a5e-6a3f-4f3c-9a51-2f7c1d6e4b10";
const NEW_KEY = "11111111-2222-4333-8444-555555555555";
const VALID = { direction: "BUY", usd: "2550", from: "card-a", to: "card-b", key: KEY };

describe("readExchangeConfirmation", () => {
  it("reads a complete confirmation URL", () => {
    expect(readExchangeConfirmation(VALID)).toEqual({
      direction: "BUY",
      usdCents: 2550,
      fromCardId: "card-a",
      toCardId: "card-b",
      idempotencyKey: KEY,
    });
  });

  it("lower-cases the key, so another case is the same exchange", () => {
    expect(readExchangeConfirmation({ ...VALID, key: KEY.toUpperCase() })).toMatchObject({
      idempotencyKey: KEY,
    });
  });

  it.each([
    ["an unknown direction", { direction: "HOLD" }],
    ["a missing amount", { usd: undefined }],
    ["a zero amount", { usd: "0" }],
    ["a decimal amount", { usd: "25.5" }],
    ["an amount over the limit", { usd: String(MAX_EXCHANGE_USD_CENTS + 1) }],
    ["a missing card", { from: undefined }],
    ["a repeated parameter", { to: ["a", "b"] }],
    ["a card id with odd characters", { to: "../x" }],
  ])("sends %s back to the form", (_name, overrides) => {
    expect(readExchangeConfirmation({ ...VALID, ...overrides })).toEqual({
      redirectTo: "/dolares",
    });
  });

  it("adds a fresh key when it is missing or malformed", () => {
    const expected = {
      redirectTo: confirmationPath(
        { direction: "BUY", usdCents: 2550, fromCardId: "card-a", toCardId: "card-b" },
        NEW_KEY,
      ),
    };
    expect(readExchangeConfirmation({ ...VALID, key: undefined }, () => NEW_KEY)).toEqual(expected);
    expect(readExchangeConfirmation({ ...VALID, key: "nope" }, () => NEW_KEY)).toEqual(expected);
  });
});

describe("confirmationPath", () => {
  it("puts every value of the exchange in the URL", () => {
    expect(
      confirmationPath(
        { direction: "SELL", usdCents: 100, fromCardId: "card-a", toCardId: "card-b" },
        KEY,
      ),
    ).toBe(`/dolares/confirmar?direction=SELL&usd=100&from=card-a&to=card-b&key=${KEY}`);
  });
});
