import { fullName } from "@/features/account/name";
import { normalizeEmail } from "@/features/auth/email";
import { db } from "@/lib/db";
import type { Currency, Prisma } from "@/generated/prisma/client";
import { normalizeAlias } from "./alias";
import type { TransferError } from "./transfer";

/** An account someone else owns, which the sender can transfer to. */
export type Recipient = {
  accountId: string;
  userId: string;
  name: string;
  email: string;
  alias: string;
  currency: Currency;
};
export type Contact = Recipient & { favorite: boolean };
type LookupResult =
  | { ok: true; recipient: Recipient }
  | { ok: false; error: Extract<TransferError, "SELF_TRANSFER" | "RECIPIENT_NOT_FOUND"> };

const USER_SELECT = { id: true, firstName: true, lastName: true, email: true } as const;

const RECIPIENT_SELECT = {
  id: true,
  alias: true,
  currency: true,
  user: { select: USER_SELECT },
} as const;

type RecipientRow = Prisma.AccountGetPayload<{ select: typeof RECIPIENT_SELECT }>;

function toRecipient({ id, alias, currency, user }: RecipientRow): Recipient {
  return {
    accountId: id,
    userId: user.id,
    name: fullName(user),
    email: user.email,
    alias,
    currency,
  };
}

export async function listContacts(ownerId: string): Promise<Contact[]> {
  const contacts = await db.contact.findMany({
    where: { ownerId },
    select: { favorite: true, contactAccount: { select: RECIPIENT_SELECT } },
    orderBy: [
      { favorite: "desc" },
      { contactAccount: { user: { firstName: "asc" } } },
      { contactAccount: { user: { lastName: "asc" } } },
      { contactAccount: { currency: "asc" } },
      { id: "asc" },
    ],
  });
  return contacts.map(({ favorite, contactAccount }) => ({
    ...toRecipient(contactAccount),
    favorite,
  }));
}

/** Returns false when the contact does not belong to the owner. */
export async function setFavorite(
  ownerId: string,
  contactAccountId: string,
  favorite: boolean,
) {
  const { count } = await db.contact.updateMany({
    where: { ownerId, contactAccountId },
    data: { favorite },
  });
  return count > 0;
}

/** An account the sender can transfer to: one that someone else owns. */
export async function getRecipient(
  senderId: string,
  accountId: string,
): Promise<Recipient | null> {
  const account = await db.account.findFirst({
    where: { id: accountId, userId: { not: senderId } },
    select: RECIPIENT_SELECT,
  });
  return account && toRecipient(account);
}

function checkRecipient(senderId: string, account: RecipientRow | undefined | null): LookupResult {
  if (!account) return { ok: false, error: "RECIPIENT_NOT_FOUND" };
  if (account.user.id === senderId) return { ok: false, error: "SELF_TRANSFER" };
  return { ok: true, recipient: toRecipient(account) };
}

/**
 * An email names a person, not an account: it resolves to their account in
 * their preferred currency, then pesos, then whichever they have.
 */
export async function findRecipientByEmail(
  senderId: string,
  email: string,
): Promise<LookupResult> {
  const user = await db.user.findFirst({
    where: { email: normalizeEmail(email) },
    select: {
      preferredCurrency: true,
      accounts: { select: RECIPIENT_SELECT, orderBy: { currency: "asc" } },
    },
  });
  const accounts = user?.accounts ?? [];
  const account =
    accounts.find((a) => a.currency === user?.preferredCurrency) ??
    accounts.find((a) => a.currency === "ARS") ??
    accounts[0];
  return checkRecipient(senderId, account);
}

/** Aliases are stored in lower case, so the lookup ignores case. */
export async function findRecipientByAlias(
  senderId: string,
  alias: string,
): Promise<LookupResult> {
  const account = await db.account.findUnique({
    where: { alias: normalizeAlias(alias) },
    select: RECIPIENT_SELECT,
  });
  return checkRecipient(senderId, account);
}
