import { normalizeEmail } from "@/features/auth/email";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeAlias } from "./alias";
import type { TransferError } from "./transfer";

export type Recipient = { userId: string; name: string; email: string; alias: string };
export type Contact = Recipient & { favorite: boolean };
type LookupResult =
  | { ok: true; recipient: Recipient }
  | { ok: false; error: Extract<TransferError, "SELF_TRANSFER" | "RECIPIENT_NOT_FOUND"> };

const RECIPIENT_SELECT = {
  id: true,
  name: true,
  email: true,
  account: { select: { alias: true } },
} as const;

type RecipientRow = Prisma.UserGetPayload<{ select: typeof RECIPIENT_SELECT }>;

// Only called on users that have an account: every query filters for it.
function toRecipient(user: RecipientRow): Recipient {
  return { userId: user.id, name: user.name, email: user.email, alias: user.account!.alias };
}

export async function listContacts(ownerId: string): Promise<Contact[]> {
  const contacts = await db.contact.findMany({
    where: { ownerId, contact: { account: { isNot: null } } },
    select: { favorite: true, contact: { select: RECIPIENT_SELECT } },
    orderBy: [{ favorite: "desc" }, { contact: { name: "asc" } }, { id: "asc" }],
  });
  return contacts.map(({ favorite, contact }) => ({
    ...toRecipient(contact),
    favorite,
  }));
}

/** Returns false when the contact does not belong to the owner. */
export async function setFavorite(
  ownerId: string,
  contactUserId: string,
  favorite: boolean,
) {
  const { count } = await db.contact.updateMany({
    where: { ownerId, contactId: contactUserId },
    data: { favorite },
  });
  return count > 0;
}

/** A user the sender can transfer to: someone else, with an account. */
export async function getRecipient(
  senderId: string,
  userId: string,
): Promise<Recipient | null> {
  if (userId === senderId) return null;
  const user = await db.user.findFirst({
    where: { id: userId, account: { isNot: null } },
    select: RECIPIENT_SELECT,
  });
  return user && toRecipient(user);
}

async function findRecipient(
  senderId: string,
  where: Prisma.UserWhereInput,
): Promise<LookupResult> {
  const user = await db.user.findFirst({
    // AND, not a spread: an alias filter also lives under `account`.
    where: { AND: [where, { account: { isNot: null } }] },
    select: RECIPIENT_SELECT,
  });
  if (!user) return { ok: false, error: "RECIPIENT_NOT_FOUND" };
  if (user.id === senderId) return { ok: false, error: "SELF_TRANSFER" };
  return { ok: true, recipient: toRecipient(user) };
}

export function findRecipientByEmail(senderId: string, email: string) {
  return findRecipient(senderId, { email: normalizeEmail(email) });
}

/** Aliases are stored in lower case, so the lookup ignores case. */
export function findRecipientByAlias(senderId: string, alias: string) {
  return findRecipient(senderId, { account: { alias: normalizeAlias(alias) } });
}
