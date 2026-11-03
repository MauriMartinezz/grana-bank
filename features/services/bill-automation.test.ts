import { describe, expect, it } from "vitest";
import { billAutomation } from "./bill-automation";

const VISA = { brand: "VISA" as const, last4: "1111" };
const MASTER = { brand: "MASTERCARD" as const, last4: "2222" };
const plain = { scheduledFor: null, scheduledCard: null, failureReason: null };

describe("billAutomation", () => {
  it("says nothing for a bill paid by hand", () => {
    expect(billAutomation(plain, null)).toBeNull();
  });

  it("names the automatic debit card", () => {
    expect(billAutomation(plain, VISA)).toEqual({
      kind: "auto-debit",
      text: "Débito automático con Visa •••• 1111",
    });
  });

  it("puts a one-off schedule before the automatic debit", () => {
    const bill = { ...plain, scheduledFor: new Date("2026-11-15T00:00:00Z"), scheduledCard: MASTER };
    expect(billAutomation(bill, VISA)).toEqual({
      kind: "scheduled",
      text: "Pago programado para el 15 de noviembre de 2026 con Mastercard •••• 2222",
    });
  });

  it("puts a failure before everything else", () => {
    const bill = {
      scheduledFor: new Date("2026-11-15T00:00:00Z"),
      scheduledCard: null,
      failureReason: "CARD_UNAVAILABLE" as const,
    };
    expect(billAutomation(bill, VISA)).toEqual({
      kind: "failed",
      text: "No se pudo pagar: la tarjeta ya no está disponible",
    });
    expect(billAutomation({ ...plain, failureReason: "INSUFFICIENT_FUNDS" }, null)?.text).toBe(
      "No se pudo pagar: no había saldo suficiente",
    );
  });
});
