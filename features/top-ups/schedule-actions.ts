"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";
import {
  parseFrequency,
  parseScheduleDay,
  scheduleDayError,
  scheduleText,
} from "@/features/deposits/schedule";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { parseTopUpAmount } from "./validation";

type Values = { amount: string; frequency: string; day: string };

/** The typed values come back with the errors, because React resets the form. */
export type TopUpScheduleState =
  | { notice: string }
  | { values: Values; errors: { amount?: string; frequency?: string; day?: string; form?: string } }
  | undefined;

/** Saves a recurring top-up of one of the user's SUBE cards: a demo, nothing runs it. */
export async function createTopUpSchedule(
  _previous: TopUpScheduleState,
  formData: FormData,
): Promise<TopUpScheduleState> {
  const user = await getCurrentUser();
  const subeCardId = String(formData.get("subeCardId") ?? "");
  const values: Values = {
    amount: String(formData.get("amount") ?? ""),
    frequency: String(formData.get("frequency") ?? ""),
    day: String(formData.get("day") ?? ""),
  };
  const errors: NonNullable<Extract<TopUpScheduleState, { errors: unknown }>>["errors"] = {};
  const amount = parseTopUpAmount(values.amount);
  if (!amount.ok) errors.amount = amount.error;
  const frequency = parseFrequency(values.frequency);
  if (!frequency) errors.frequency = "Elegí cada cuánto.";
  const day = parseScheduleDay(frequency, values.day);
  if (frequency && day === null) errors.day = scheduleDayError(frequency);
  if (!amount.ok || !frequency || day === null) return { values, errors };

  try {
    const card = await db.subeCard.findFirst({ where: { id: subeCardId, userId: user.id } });
    if (!card) return { values, errors: { form: "Esta tarjeta SUBE ya no está disponible." } };
    await db.topUpSchedule.create({
      data: { userId: user.id, subeCardId, amountCents: amount.cents, frequency, day },
    });
  } catch (error) {
    console.error("Top-up schedule failed", error);
    return { values, errors: { form: "No pudimos programar la recarga. Probá de nuevo." } };
  }

  revalidatePath(`/recargas/sube/${subeCardId}`);
  const when = scheduleText(frequency, day);
  return {
    notice: `Programamos ${formatMoney(amount.cents, "ARS")} ${when.charAt(0).toLowerCase()}${when.slice(1)}. Es una demo: no se carga saldo.`,
  };
}

/** Deletes one of the user's scheduled top-ups; another user's id deletes nothing. */
export async function deleteTopUpSchedule(formData: FormData) {
  const user = await getCurrentUser();
  const scheduleId = String(formData.get("scheduleId") ?? "");
  const schedule = await db.topUpSchedule.findFirst({
    where: { id: scheduleId, userId: user.id },
    select: { subeCardId: true },
  });
  if (!schedule) redirect("/recargas/sube");
  await db.topUpSchedule.delete({ where: { id: scheduleId } });
  revalidatePath(`/recargas/sube/${schedule.subeCardId}`);
  redirect(`/recargas/sube/${schedule.subeCardId}`);
}
