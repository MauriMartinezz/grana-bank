"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { revalidateAccountScreens } from "@/features/account/revalidate";
import { getCurrentUser } from "@/features/auth/current-user";
import { validateNote } from "@/features/categories/names";
import { isCardId } from "@/features/exchange/confirmation";
import { normalizeNickname } from "@/features/top-ups/validation";
import { isIdempotencyKey } from "@/features/transfers/confirmation";
import type { Currency } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { adhereService as createAdhesion } from "./adhesions";
import { validateAdhesion, type AdhesionErrors } from "./companies";
import { confirmationPath } from "./confirmation";
import { calendarToday, formatDueDate } from "./due-date";
import { payBill, resolvePaymentCard, type PayBillError } from "./pay-bill";
import { parseScheduleDate } from "./schedule";
import { processScheduledPayments, type ProcessSummary } from "./scheduled-payments";

export type AdhereServiceState =
  | {
      values: { company: string; paymentNumber: string; nickname: string };
      errors: AdhesionErrors & { form?: string };
    }
  | undefined;

export type BillPaymentFormState = { error: string } | undefined;

export type NoticeState = { error: string } | { notice: string } | undefined;

const PAY_ERRORS: Record<PayBillError, string> = {
  BILL_NOT_FOUND: "Esta factura ya no está disponible.",
  ALREADY_PAID: "Esta factura ya está paga.",
  CARD_NOT_FOUND: "Esta tarjeta ya no está disponible.",
  CURRENCY_MISMATCH: "Elegí una tarjeta en la moneda de la factura.",
  INSUFFICIENT_FUNDS: "No tenés saldo suficiente para pagar esta factura.",
  IDEMPOTENCY_MISMATCH: "La operación expiró. Volvé a intentarlo.",
  NOT_SCHEDULED: "Este pago ya no está programado.",
  INVALID_NOTE: "La nota tiene hasta 140 caracteres.",
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
  const note = validateNote(text(formData, "note"));
  if (!note.ok) return { error: note.error };

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
  redirect(confirmationPath({ billId, cardId, note: note.note }, randomUUID()));
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
    result = await payBill({
      userId: user.id,
      billId,
      cardId,
      idempotencyKey,
      note: text(formData, "note"),
    });
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

function cardError(error: "CARD_NOT_FOUND" | "CURRENCY_MISMATCH", currency: Currency) {
  return error === "CURRENCY_MISMATCH"
    ? `Elegí una tarjeta de tu cuenta en ${CURRENCY_NAMES[currency]}.`
    : PAY_ERRORS[error];
}

/** Schedules a one-off payment of a pending bill on a date and with a card. */
export async function scheduleBillPayment(
  _previous: BillPaymentFormState,
  formData: FormData,
): Promise<BillPaymentFormState> {
  const user = await getCurrentUser();
  const billId = text(formData, "billId");
  const cardId = text(formData, "cardId");
  if (!isCardId(billId)) return { error: PAY_ERRORS.BILL_NOT_FOUND };
  if (!isCardId(cardId)) return { error: PAY_ERRORS.CARD_NOT_FOUND };

  let adhesionId: string;
  try {
    const bill = await db.serviceBill.findFirst({
      where: { id: billId, adhesion: { userId: user.id } },
      select: { status: true, currency: true, dueDate: true, adhesionId: true },
    });
    if (!bill) return { error: PAY_ERRORS.BILL_NOT_FOUND };
    if (bill.status !== "PENDING") return { error: PAY_ERRORS.ALREADY_PAID };
    const date = parseScheduleDate(
      text(formData, "date"),
      bill.dueDate,
      calendarToday(new Date()),
      (last) => `Elegí una fecha hasta el vencimiento, el ${formatDueDate(last)}.`,
    );
    if (!date.ok) return { error: date.error };
    const card = await resolvePaymentCard(db, user.id, cardId, bill.currency);
    if (!card.ok) return { error: cardError(card.error, bill.currency) };

    // The balance is checked when the payment runs, not now.
    const { count } = await db.serviceBill.updateMany({
      where: { id: billId, status: "PENDING" },
      data: { scheduledFor: date.date, scheduledCardId: cardId, failedAt: null, failureReason: null },
    });
    if (count === 0) return { error: PAY_ERRORS.ALREADY_PAID };
    adhesionId = bill.adhesionId;
  } catch (error) {
    console.error("Bill schedule failed", error);
    return { error: "No pudimos programar el pago. Probá de nuevo." };
  }

  revalidateAccountScreens();
  redirect(`/servicios/${adhesionId}`);
}

/** Cancels the one-off payment of the user's bill, and any failure of it. */
export async function cancelScheduledPayment(formData: FormData) {
  const user = await getCurrentUser();
  const billId = text(formData, "billId");
  const bill = isCardId(billId)
    ? await db.serviceBill.findFirst({
        where: { id: billId, adhesion: { userId: user.id } },
        select: { adhesionId: true },
      })
    : null;
  if (!bill) redirect("/servicios");

  await db.serviceBill.updateMany({
    where: { id: billId, status: "PENDING" },
    data: { scheduledFor: null, scheduledCardId: null, failedAt: null, failureReason: null },
  });
  revalidateAccountScreens();
  redirect(`/servicios/${bill.adhesionId}`);
}

/**
 * Turns the automatic debit of an adhesion on with a card, or off with an
 * empty card. Either way, the failed debits of its bills are cleared, so the
 * next run tries them again with the new setting.
 */
export async function saveAutoDebit(_previous: NoticeState, formData: FormData): Promise<NoticeState> {
  const user = await getCurrentUser();
  const adhesionId = text(formData, "adhesionId");
  const cardId = text(formData, "cardId");
  const notAvailable = { error: "Este servicio ya no está disponible." };
  if (!isCardId(adhesionId)) return notAvailable;
  if (cardId !== "" && !isCardId(cardId)) return { error: PAY_ERRORS.CARD_NOT_FOUND };

  try {
    const adhesion = await db.serviceAdhesion.findFirst({
      where: { id: adhesionId, userId: user.id },
      select: { bills: { select: { currency: true }, orderBy: { dueDate: "desc" }, take: 1 } },
    });
    if (!adhesion) return notAvailable;
    if (cardId !== "") {
      // An adhesion bills in one currency; pesos until it has a bill.
      const currency = adhesion.bills[0]?.currency ?? "ARS";
      const card = await resolvePaymentCard(db, user.id, cardId, currency);
      if (!card.ok) return { error: cardError(card.error, currency) };
    }
    await db.$transaction([
      db.serviceAdhesion.update({
        where: { id: adhesionId },
        data: { autoDebitCardId: cardId === "" ? null : cardId },
      }),
      db.serviceBill.updateMany({
        where: { adhesionId, status: "PENDING", scheduledFor: null, failedAt: { not: null } },
        data: { failedAt: null, failureReason: null },
      }),
    ]);
  } catch (error) {
    console.error("Auto-debit change failed", error);
    return { error: "No pudimos guardar el débito automático. Probá de nuevo." };
  }

  revalidateAccountScreens();
  return { notice: cardId === "" ? "Débito automático desactivado." : "Débito automático activado." };
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** `Pagamos 2 facturas. 1 pago no se pudo hacer. ...` */
function processNotice({ paid, failed }: ProcessSummary) {
  const parts: string[] = [];
  if (paid > 0) parts.push(`Pagamos ${plural(paid, "factura", "facturas")}.`);
  if (failed > 0) {
    parts.push(
      `${plural(failed, "pago no se pudo hacer", "pagos no se pudieron hacer")}. Revisá el aviso en el servicio.`,
    );
  }
  return parts.length > 0 ? parts.join(" ") : "No había pagos para procesar hoy.";
}

/**
 * The demo stand-in for the cron: runs today's scheduled and automatic
 * payments of the signed-in user only.
 */
// Takes no arguments: the form sends nothing it needs.
export async function processMyScheduledPayments(): Promise<NoticeState> {
  const user = await getCurrentUser();
  let summary: ProcessSummary;
  try {
    summary = await processScheduledPayments({ now: new Date(), userId: user.id });
  } catch (error) {
    console.error("Scheduled payments run failed", error);
    return { error: "No pudimos procesar los pagos agendados. Probá de nuevo." };
  }
  revalidateAccountScreens();
  return { notice: processNotice(summary) };
}

const REMINDER_DAYS = [0, 1, 3, 7] as const;

function reminderNotice(days: number | null) {
  if (days === null) return "Recordatorios desactivados.";
  if (days === 0) return "Te vamos a avisar el día del vencimiento.";
  return `Te vamos a avisar ${days === 1 ? "1 día" : `${days} días`} antes del vencimiento.`;
}

/**
 * Sets when the bills of a service remind the user in Notificaciones: the
 * same day, 1, 3 or 7 days before the due date, or never with an empty value.
 */
export async function saveReminder(_previous: NoticeState, formData: FormData): Promise<NoticeState> {
  const user = await getCurrentUser();
  const adhesionId = text(formData, "adhesionId");
  const raw = text(formData, "reminderDays");
  const days = raw === "" ? null : REMINDER_DAYS.find((value) => String(value) === raw);
  if (days === undefined) return { error: "Elegí cuándo avisarte." };

  try {
    const { count } = await db.serviceAdhesion.updateMany({
      where: { id: adhesionId, userId: user.id },
      data: { reminderDays: days },
    });
    if (count === 0) return { error: "Este servicio ya no está disponible." };
  } catch (error) {
    console.error("Reminder change failed", error);
    return { error: "No pudimos guardar el recordatorio. Probá de nuevo." };
  }

  revalidateAccountScreens();
  return { notice: reminderNotice(days) };
}
