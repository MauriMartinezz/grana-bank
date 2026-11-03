"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccount } from "@/features/account/queries";
import { revalidateAccountScreens } from "@/features/account/revalidate";
import { isValidEmail, normalizeEmail } from "@/features/auth/email";
import { getCurrentUser } from "@/features/auth/current-user";
import { formatMoney } from "@/lib/format";
import { parseAmountToCents } from "./amount";
import { isIdempotencyKey } from "./confirmation";
import { isValidAlias, normalizeAlias } from "./alias";
import {
  findRecipientByAlias,
  findRecipientByEmail,
  getRecipient,
  setFavorite,
} from "./contacts";
import { transfer, type TransferError } from "./transfer";

/** The typed value comes back because React resets the form after an action. */
export type FieldState = { value: string; error: string } | undefined;
export type ConfirmState = { error: string } | undefined;

const TRANSFER_ERRORS: Record<TransferError, string> = {
  INVALID_AMOUNT: "El monto no es válido. Volvé a ingresarlo.",
  INSUFFICIENT_FUNDS: "No tenés saldo suficiente para esta transferencia.",
  RECIPIENT_NOT_FOUND: "Este destinatario ya no está disponible.",
  SELF_TRANSFER: "No podés transferirte a vos mismo.",
  CURRENCY_MISMATCH: "No tenés una cuenta en esa moneda.",
  IDEMPOTENCY_MISMATCH: "La operación expiró. Volvé a intentarlo.",
};

const LOOKUPS = {
  alias: {
    normalize: normalizeAlias,
    isValid: isValidAlias,
    find: findRecipientByAlias,
    messages: {
      empty: "Ingresá el alias del destinatario.",
      invalid:
        "El alias tiene hasta 40 caracteres: letras sin tildes, números y puntos, con al menos una letra.",
      notFound: "No encontramos una cuenta con ese alias.",
    },
  },
  email: {
    normalize: normalizeEmail,
    isValid: isValidEmail,
    find: findRecipientByEmail,
    messages: {
      empty: "Ingresá el email del destinatario.",
      invalid: "Ingresá un email válido.",
      notFound: "No encontramos una cuenta con ese email.",
    },
  },
};

export async function toggleFavorite(formData: FormData): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  const contactAccountId = String(formData.get("contactAccountId") ?? "");
  const favorite = formData.get("favorite") === "true";

  try {
    await setFavorite(user.id, contactAccountId, favorite);
  } catch (error) {
    console.error("Favorite update failed", error);
    return { ok: false };
  }
  revalidatePath("/transfers");
  return { ok: true };
}

export async function lookupRecipient(
  _previous: FieldState,
  formData: FormData,
): Promise<FieldState> {
  const user = await getCurrentUser();
  // Alias is the default; the screen offers email behind a button.
  const by = formData.get("by") === "email" ? "email" : "alias";
  const lookup = LOOKUPS[by];
  const value = lookup.normalize(String(formData.get(by) ?? ""));

  if (!value) return { value, error: lookup.messages.empty };
  if (!lookup.isValid(value)) return { value, error: lookup.messages.invalid };

  let result;
  try {
    result = await lookup.find(user.id, value);
  } catch (error) {
    console.error("Recipient lookup failed", error);
    return { value, error: "No pudimos buscar el destinatario. Probá de nuevo." };
  }
  if (!result.ok) {
    return {
      value,
      error:
        result.error === "RECIPIENT_NOT_FOUND"
          ? lookup.messages.notFound
          : TRANSFER_ERRORS[result.error],
    };
  }

  redirect(`/transfers/to/${result.recipient.accountId}`);
}

export async function reviewAmount(
  _previous: FieldState,
  formData: FormData,
): Promise<FieldState> {
  const user = await getCurrentUser();
  const recipientAccountId = String(formData.get("recipientAccountId") ?? "");
  const value = String(formData.get("amount") ?? "");

  if (!value.trim()) return { value, error: "Ingresá un monto." };
  const amountCents = parseAmountToCents(value);
  if (amountCents === null) {
    return { value, error: "Ingresá un monto mayor a cero, con hasta 2 decimales." };
  }

  try {
    const recipient = await getRecipient(user.id, recipientAccountId);
    if (!recipient) {
      return { value, error: TRANSFER_ERRORS.RECIPIENT_NOT_FOUND };
    }
    // The money leaves the sender's account in the recipient's currency.
    const account = await getAccount(user.id, recipient.currency);
    if (!account) {
      return { value, error: TRANSFER_ERRORS.CURRENCY_MISMATCH };
    }
    // Checked again when the transfer runs; this only spares a wasted step.
    if (account.balanceCents < BigInt(amountCents)) {
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
    `/transfers/to/${recipientAccountId}/confirm?amount=${amountCents}&key=${randomUUID()}`,
  );
}

export async function confirmTransfer(
  _previous: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const user = await getCurrentUser();
  const recipientAccountId = String(formData.get("recipientAccountId") ?? "");
  const rawAmount = String(formData.get("amountCents") ?? "");
  // Lower case, so the same key in another case is the same transfer.
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").toLowerCase();

  if (!/^\d{1,12}$/.test(rawAmount)) {
    return { error: TRANSFER_ERRORS.INVALID_AMOUNT };
  }
  if (!isIdempotencyKey(idempotencyKey)) {
    return { error: TRANSFER_ERRORS.IDEMPOTENCY_MISMATCH };
  }

  let result;
  try {
    result = await transfer({
      senderId: user.id,
      recipientAccountId,
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
  if (!result.ok) return { error: TRANSFER_ERRORS[result.error] };

  revalidateAccountScreens();
  redirect(`/transfers/success/${result.movementId}`);
}
