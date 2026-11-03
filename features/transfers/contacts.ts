import { normalizeEmail } from "@/features/auth/email";
import { db } from "@/lib/db";
import type { TransferError } from "./transfer";

export type Recipient = { userId: string; name: string; email: string };
export type Contact = Recipient & { favorite: boolean };

const RECIPIENT_SELECT = { id: true, name: true, email: true } as const;

function toRecipient(user: { id: string; name: string; email: string }): Recipient {
  return { userId: user.id, name: user.name, email: user.email };
}

export async function listContacts(ownerId: string): Promise<Contact[]> {
  const contacts = await db.contact.findMany({
    where: { ownerId },
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

export async function findRecipientByEmail(
  senderId: string,
  email: string,
): Promise<
  | { ok: true; recipient: Recipient }
  | { ok: false; error: Extract<TransferError, "SELF_TRANSFER" | "RECIPIENT_NOT_FOUND"> }
> {
  const user = await db.user.findFirst({
    where: { email: normalizeEmail(email), account: { isNot: null } },
    select: RECIPIENT_SELECT,
  });
  if (!user) return { ok: false, error: "RECIPIENT_NOT_FOUND" };
  if (user.id === senderId) return { ok: false, error: "SELF_TRANSFER" };
  return { ok: true, recipient: toRecipient(user) };
}
