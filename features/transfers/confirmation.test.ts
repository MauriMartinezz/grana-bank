import { describe, expect, it } from "vitest";
import { MAX_TRANSFER_CENTS } from "./amount";
import { isIdempotencyKey, readConfirmation } from "./confirmation";

const KEY = "0b5f3d2e-8c1a-4f6b-9e7d-2a4c6e8f0a1b";
const NEW_KEY = "11111111-2222-4333-8444-555555555555";
const newKey = () => NEW_KEY;

describe("readConfirmation", () => {
  it("returns the amount and the key in lower case", () => {
    expect(readConfirmation("u1", "2550", KEY.toUpperCase(), newKey)).toEqual({
      amountCents: 2550,
      idempotencyKey: KEY,
    });
  });

  it.each([undefined, "", "0", "-100", "1.5", "abc", ["1", "2"], String(MAX_TRANSFER_CENTS + 1)])(
    "sends an invalid amount %j back to the amount screen",
    (amount) => {
      expect(readConfirmation("u1", amount, KEY, newKey)).toEqual({
        redirectTo: "/transferir/u1",
      });
    },
  );

  it.each([undefined, "", "not-a-key", [KEY, KEY]])(
    "starts a fresh confirmation for a missing or malformed key %j",
    (key) => {
      expect(readConfirmation("u1", "100", key, newKey)).toEqual({
        redirectTo: `/transferir/u1/confirmar?amount=100&key=${NEW_KEY}`,
      });
    },
  );
});

describe("isIdempotencyKey", () => {
  it("accepts a UUID in any case and nothing else", () => {
    expect(isIdempotencyKey(KEY)).toBe(true);
    expect(isIdempotencyKey(KEY.toUpperCase())).toBe(true);
    expect(isIdempotencyKey(`${KEY}x`)).toBe(false);
    expect(isIdempotencyKey("")).toBe(false);
  });
});
