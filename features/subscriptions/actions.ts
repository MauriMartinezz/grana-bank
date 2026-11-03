"use server";

import { defaultCardId } from "@/features/cards/default-card";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";
import { buenosAiresDate } from "@/features/services/due-date";
import { db } from "@/lib/db";
import { catalogItem } from "./catalog";

export type SubscribeState = { error: string } | undefined;
export type ChangeCardState = { notice: string } | { error: string } | undefined;

const PATH = "/suscripciones";

/**
 * Subscribes the user to a catalog service in pesos, on the first card of
 * their peso account, billed each month on today's day. A demo: nothing is
 * charged.
 */
export async function subscribe(_previous: SubscribeState, formData: FormData): Promise<SubscribeState> {
  const user = await getCurrentUser();
  const item = catalogItem(String(formData.get("slug") ?? ""));
  if (!item) return { error: "Elegí un servicio de la lista." };

  let subscriptionId: string;
  try {
    const duplicate = await db.subscription.findFirst({
      where: { userId: user.id, merchant: item.merchant, status: "ACTIVE" },
      select: { id: true },
    });
    if (duplicate) return { error: `Ya tenés una suscripción activa a ${item.merchant}.` };

    // The peso account's default card: the chosen one, else the oldest.
    const pesos = await db.account.findFirst({
      where: { userId: user.id, currency: "ARS" },
      select: {
        defaultCardId: true,
        cards: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true } },
      },
    });
    const cardId = pesos ? defaultCardId(pesos.cards, pesos.defaultCardId) : null;
    const card = cardId ? { id: cardId } : null;
    if (!card) {
      return { error: "Necesitás una tarjeta en pesos para suscribirte. Agregala en Tarjetas." };
    }

    const created = await db.subscription.create({
      data: {
        userId: user.id,
        merchant: item.merchant,
        amountCents: item.amountCents,
        currency: "ARS",
        cardId: card.id,
        billingDay: buenosAiresDate(new Date()).day,
      },
      select: { id: true },
    });
    subscriptionId = created.id;
  } catch (error) {
    console.error("Subscribe failed", error);
    return { error: "No pudimos agregar la suscripción. Probá de nuevo." };
  }

  revalidatePath(PATH);
  redirect(`${PATH}/${subscriptionId}`);
}

/**
 * Cancels one of the user's active subscriptions. Cancelling again keeps the
 * first date, and another user's id changes nothing.
 */
export async function cancelSubscription(formData: FormData) {
  const user = await getCurrentUser();
  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  await db.subscription.updateMany({
    where: { id: subscriptionId, userId: user.id, status: "ACTIVE" },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  revalidatePath(PATH);
  redirect(`${PATH}/${subscriptionId}`);
}

/** Moves one of the user's active subscriptions to another of their cards in its currency. */
export async function changeSubscriptionCard(
  _previous: ChangeCardState,
  formData: FormData,
): Promise<ChangeCardState> {
  const user = await getCurrentUser();
  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  const cardId = String(formData.get("cardId") ?? "");

  try {
    const subscription = await db.subscription.findFirst({
      where: { id: subscriptionId, userId: user.id },
      select: { status: true, currency: true },
    });
    if (!subscription) return { error: "No encontramos la suscripción." };
    if (subscription.status !== "ACTIVE") return { error: "Esta suscripción está dada de baja." };

    const card = await db.card.findFirst({
      where: { id: cardId, account: { userId: user.id, currency: subscription.currency } },
      select: { id: true },
    });
    if (!card) {
      return {
        error: `Elegí una de tus tarjetas en ${subscription.currency === "USD" ? "dólares" : "pesos"}.`,
      };
    }

    await db.subscription.updateMany({
      where: { id: subscriptionId, userId: user.id, status: "ACTIVE" },
      data: { cardId: card.id },
    });
  } catch (error) {
    console.error("Subscription card change failed", error);
    return { error: "No pudimos cambiar la tarjeta. Probá de nuevo." };
  }

  revalidatePath(`${PATH}/${subscriptionId}`);
  return { notice: "Listo, la cobraríamos en esta tarjeta. Es una demo: no se cobra." };
}
