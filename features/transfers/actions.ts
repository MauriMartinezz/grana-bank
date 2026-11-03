"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccount } from "@/features/account/queries";
import { isValidEmail, normalizeEmail } from "@/features/auth/email";
import { getCurrentUser } from "@/features/auth/current-user";
import { formatMoney } from "@/lib/format";
import { parseAmountToCents } from "./amount";
import { findRecipientByEmail, getRecipient, setFavorite } from "./contacts";
import { transfer, type TransferError } from "./transfer";

/** The typed value comes back because React resets the form after an action. */
export type FieldState = { value: string; error: string } | undefined;
export type ConfirmState = { error: string } | undefined;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TRANSFER_ERRORS: Record<TransferError, string> = {
  INVALID_AMOUNT: "El monto no es válido. Volvé a ingresarlo.",
  INSUFFICIENT_FUNDS: "No tenés saldo suficiente para esta transferencia.",
  RECIPIENT_NOT_FOUND: "No encontramos una cuenta con ese email.",
  SELF_TRANSFER: "No podés transferirte a vos mismo.",
  IDEMPOTENCY_MISMATCH: "La operación expiró. Volvé a intentarlo.",
};

export async function toggleFavorite(formData: FormData) {
  const user = await getCurrentUser();
  const contactUserId = String(formData.get("contactUserId") ?? "");
  const favorite = formData.get("favorite") === "true";

  await setFavorite(user.id, contactUserId, favorite);
  revalidatePath("/transfers");
}

export async function lookupRecipient(
  _previous: FieldState,
  formData: FormData,
): Promise<FieldState> {
  const user = await getCurrentUser();
  const value = normalizeEmail(String(formData.get("email") ?? ""));

  if (!value) return { value, error: "Ingresá el email del destinatario." };
  if (!isValidEmail(value)) return { value, error: "Ingresá un email válido." };

  let result;
  try {
    result = await findRecipientByEmail(user.id, value);
  } catch (error) {
    console.error("Recipient lookup failed", error);
    return { value, error: "No pudimos buscar el destinatario. Probá de nuevo." };
  }
  if (!result.ok) return { value, error: TRANSFER_ERRORS[result.error] };

  redirect(`/transfers/to/${result.recipient.userId}`);
}

export async function reviewAmount(
  _previous: FieldState,
  formData: FormData,
): Promise<FieldState> {
  const user = await getCurrentUser();
  const recipientId = String(formData.get("recipientId") ?? "");
  const value = String(formData.get("amount") ?? "");

  if (!value.trim()) return { value, error: "Ingresá un monto." };
  const amountCents = parseAmountToCents(value);
  if (amountCents === null) {
    return { value, error: "Ingresá un monto mayor a cero, con hasta 2 decimales." };
  }

  try {
    const [account, recipient] = await Promise.all([
      getAccount(user.id),
      getRecipient(user.id, recipientId),
    ]);
    if (!recipient) {
      return { value, error: "Este destinatario ya no está disponible." };
    }
    // Checked again when the transfer runs; this only spares a wasted step.
    if (account && account.balanceCents < amountCents) {
      return {
        value,
        error: `No tenés saldo suficiente. Disponible: ${formatMoney(account.balanceCents, account.currency)}`,
      };
    }
  } catch (error) {
    console.error("Amount review failed", error);
    return { value, error: "No pudimos validar el monto. Probá de nuevo." };
  }

  // The key is created here and travels in the URL, so going back to the
  // confirmation screen, or retrying after an error, reuses it and can never
  // charge twice.
  redirect(
    `/transfers/to/${recipientId}/confirm?amount=${amountCents}&key=${randomUUID()}`,
  );
}

export async function confirmTransfer(
  _previous: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const user = await getCurrentUser();
  const recipientId = String(formData.get("recipientId") ?? "");
  const rawAmount = String(formData.get("amountCents") ?? "");
  // Lower case, so the same key in another case is the same transfer.
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").toLowerCase();

  if (!/^\d{1,12}$/.test(rawAmount)) {
    return { error: TRANSFER_ERRORS.INVALID_AMOUNT };
  }
  if (!UUID_PATTERN.test(idempotencyKey)) {
    return { error: TRANSFER_ERRORS.IDEMPOTENCY_MISMATCH };
  }

  let result;
  try {
    result = await transfer({
      senderId: user.id,
      recipientId,
      amountCents: Number(rawAmount),
      idempotencyKey,
    });
  } catch (error) {
    console.error("Transfer failed", error);
    // The form keeps its key, so a retry can never charge twice.
    return {
      error: "No pudimos completar la transferencia. Probá de nuevo: no se va a cobrar dos veces.",
    };
  }
  if (!result.ok) {
    // The user picked this recipient from a list, never typed an email here.
    return {
      error:
        result.error === "RECIPIENT_NOT_FOUND"
          ? "Este destinatario ya no está disponible."
          : TRANSFER_ERRORS[result.error],
    };
  }

  revalidatePath("/", "layout");
  redirect(`/transfers/success/${result.movementId}`);
}
