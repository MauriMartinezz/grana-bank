"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { revalidateAccountScreens } from "@/features/account/revalidate";
import { getCurrentUser } from "@/features/auth/current-user";
import { isCardId } from "@/features/exchange/confirmation";
import { normalizeNickname } from "@/features/top-ups/validation";
import { isIdempotencyKey } from "@/features/transfers/confirmation";
import type { Currency } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { adhereService as createAdhesion } from "./adhesions";
import { validateAdhesion, type AdhesionErrors } from "./companies";
import { confirmationPath } from "./confirmation";
import { payBill, resolvePaymentCard, type PayBillError } from "./pay-bill";

export type AdhereServiceState =
  | {
      values: { company: string; paymentNumber: string; nickname: string };
      errors: AdhesionErrors & { form?: string };
    }
  | undefined;

export type BillPaymentFormState = { error: string } | undefined;

const PAY_ERRORS: Record<PayBillError, string> = {
  BILL_NOT_FOUND: "Esta factura ya no está disponible.",
  ALREADY_PAID: "Esta factura ya está paga.",
  CARD_NOT_FOUND: "Esta tarjeta ya no está disponible.",
  CURRENCY_MISMATCH: "Elegí una tarjeta en la moneda de la factura.",
  INSUFFICIENT_FUNDS: "No tenés saldo suficiente para pagar esta factura.",
  IDEMPOTENCY_MISMATCH: "La operación expiró. Volvé a intentarlo.",
  NOT_SCHEDULED: "Este pago ya no está programado.",
};

const CURRENCY_NAMES: Record<Currency, string> = { ARS: "pesos", USD: "dólares" };

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

export async function adhereService(
  _previous: AdhereServiceState,
  formData: FormData,
): Promise<AdhereServiceState> {
  const user = await getCurrentUser();
  const company = text(formData, "company");
  const paymentNumber = text(formData, "paymentNumber").trim();
  const nickname = text(formData, "nickname");
  const result = validateAdhesion({ company, paymentNumber, nickname });
  const values = { company, paymentNumber, nickname: normalizeNickname(nickname) };
  if (!result.ok) return { values, errors: result.errors };

  let adhesionId: string;
  try {
    const created = await createAdhesion(user.id, result.adhesion);
    if (!created.ok) {
      return { values, errors: { form: "Ya adheriste este servicio con ese número." } };
    }
    adhesionId = created.adhesionId;
  } catch (error) {
    console.error("Service adhesion failed", error);
    return { values, errors: { form: "No pudimos adherir el servicio. Probá de nuevo." } };
  }

  revalidatePath("/servicios");
  redirect(`/servicios/${adhesionId}`);
}

export async function reviewBillPayment(
  _previous: BillPaymentFormState,
  formData: FormData,
): Promise<BillPaymentFormState> {
  const user = await getCurrentUser();
  const billId = text(formData, "billId");
  const cardId = text(formData, "cardId");
  if (!isCardId(billId)) return { error: PAY_ERRORS.BILL_NOT_FOUND };
  if (!isCardId(cardId)) return { error: PAY_ERRORS.CARD_NOT_FOUND };

  try {
    const bill = await db.serviceBill.findFirst({
      where: { id: billId, adhesion: { userId: user.id } },
      select: { status: true, amountCents: true, currency: true },
    });
    if (!bill) return { error: PAY_ERRORS.BILL_NOT_FOUND };
    if (bill.status !== "PENDING") return { error: PAY_ERRORS.ALREADY_PAID };
    const card = await resolvePaymentCard(db, user.id, cardId, bill.currency);
    if (!card.ok) {
      return {
        error:
          card.error === "CURRENCY_MISMATCH"
            ? `Elegí una tarjeta de tu cuenta en ${CURRENCY_NAMES[bill.currency]}.`
            : PAY_ERRORS[card.error],
      };
    }
    const account = await db.account.findUniqueOrThrow({
      where: { id: card.accountId },
      select: { balanceCents: true, currency: true },
    });
    // Checked again when the payment runs; this only spares a wasted step.
    if (account.balanceCents < bill.amountCents) {
      return {
        error: `No tenés saldo suficiente. Disponible: ${formatMoney(account.balanceCents, account.currency)}`,
      };
    }
  } catch (error) {
    console.error("Bill payment review failed", error);
    return { error: "No pudimos validar el pago. Probá de nuevo." };
  }

  // The key is created here and travels in the URL, so going back to the
  // confirmation screen, or retrying after an error, reuses it and can never
  // charge twice.
  redirect(confirmationPath({ billId, cardId }, randomUUID()));
}

export async function confirmBillPayment(
  _previous: BillPaymentFormState,
  formData: FormData,
): Promise<BillPaymentFormState> {
  const user = await getCurrentUser();
  const billId = text(formData, "billId");
  const cardId = text(formData, "cardId");
  // Lower case, so the same key in another case is the same payment.
  const idempotencyKey = text(formData, "idempotencyKey").toLowerCase();
  if (!isCardId(billId)) return { error: PAY_ERRORS.BILL_NOT_FOUND };
  if (!isCardId(cardId)) return { error: PAY_ERRORS.CARD_NOT_FOUND };
  if (!isIdempotencyKey(idempotencyKey)) return { error: PAY_ERRORS.IDEMPOTENCY_MISMATCH };

  let result;
  try {
    result = await payBill({ userId: user.id, billId, cardId, idempotencyKey });
  } catch (error) {
    console.error("Bill payment failed", error);
    // The form keeps its key, so a retry can never charge twice.
    return {
      error: "No pudimos pagar la factura. Probá de nuevo: no se va a cobrar dos veces.",
    };
  }
  if (!result.ok) return { error: PAY_ERRORS[result.error] };

  revalidateAccountScreens();
  redirect(`/servicios/comprobante/${result.movementId}`);
}
