import { describe, expect, it } from "vitest";
import { confirmationPath, readBillConfirmation } from "./confirmation";

const KEY = "0b7c3a52-5a0e-4c8e-9c39-2a6f1a7d9e10";
const NEW_KEY = "11111111-2222-4333-8444-555555555555";
const BILL = "4f7d2c1e-0000-4000-8000-000000000001";
const CARD = "4f7d2c1e-0000-4000-8000-000000000002";

describe("confirmationPath", () => {
  it("carries the bill, the card and the key in the URL", () => {
    expect(confirmationPath({ billId: BILL, cardId: CARD }, KEY)).toBe(
      `/servicios/confirmar?bill=${BILL}&card=${CARD}&key=${KEY}`,
    );
  });
});

describe("readBillConfirmation", () => {
  const read = (params: Record<string, string | string[] | undefined>) =>
    readBillConfirmation(
      { bill: params.bill, card: params.card, key: params.key },
      () => NEW_KEY,
    );

  it("reads a complete URL and lower-cases the key", () => {
    expect(read({ bill: BILL, card: CARD, key: KEY.toUpperCase() })).toEqual({
      billId: BILL,
      cardId: CARD,
      idempotencyKey: KEY,
    });
  });

  it("creates a key once when the URL has none or a bad one", () => {
    const expected = { redirectTo: `/servicios/confirmar?bill=${BILL}&card=${CARD}&key=${NEW_KEY}` };
    expect(read({ bill: BILL, card: CARD })).toEqual(expected);
    expect(read({ bill: BILL, card: CARD, key: "nope" })).toEqual(expected);
  });

  it("goes back to the bill when the card is missing", () => {
    expect(read({ bill: BILL, key: KEY })).toEqual({ redirectTo: `/servicios/pagar/${BILL}` });
    expect(read({ bill: BILL, card: [CARD, CARD], key: KEY })).toEqual({
      redirectTo: `/servicios/pagar/${BILL}`,
    });
  });

  it("goes back to Servicios when the bill is missing or malformed", () => {
    expect(read({ card: CARD, key: KEY })).toEqual({ redirectTo: "/servicios" });
    expect(read({ bill: "../inicio", card: CARD, key: KEY })).toEqual({ redirectTo: "/servicios" });
  });
});
