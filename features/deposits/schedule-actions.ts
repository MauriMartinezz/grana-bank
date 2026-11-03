"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccount } from "@/features/account/queries";
import { getCurrentUser } from "@/features/auth/current-user";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { scheduleText, validateDepositSchedule, type DepositScheduleErrors } from "./schedule";

type Values = { currency: string; amount: string; frequency: string; day: string };

/** The typed values come back with the errors, because React resets the form. */
export type DepositScheduleState =
  | { notice: string }
  | { values: Values; errors: DepositScheduleErrors & { form?: string } }
  | undefined;

const PATH = "/ingresar-dinero/programar";

export async function createDepositSchedule(
  _previous: DepositScheduleState,
  formData: FormData,
): Promise<DepositScheduleState> {
  const user = await getCurrentUser();
  const values: Values = {
    currency: String(formData.get("currency") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    frequency: String(formData.get("frequency") ?? ""),
    day: String(formData.get("day") ?? ""),
  };
  const result = validateDepositSchedule(values);
  if (!result.ok) return { values, errors: result.errors };
  const { currency, amountCents, frequency, day } = result.schedule;

  try {
    if (!(await getAccount(user.id, currency))) {
      return {
        values,
        errors: { currency: `No tenés una cuenta en ${currency === "USD" ? "dólares" : "pesos"}.` },
      };
    }
    await db.depositSchedule.create({
      data: { userId: user.id, currency, amountCents, frequency, day },
    });
  } catch (error) {
    console.error("Deposit schedule failed", error);
    return { values, errors: { form: "No pudimos programar el ingreso. Probá de nuevo." } };
  }

  revalidatePath(PATH);
  const when = scheduleText(frequency, day);
  return {
    notice: `Programamos ${formatMoney(amountCents, currency)} ${when.charAt(0).toLowerCase()}${when.slice(1)}. Es una demo: no se ingresa dinero.`,
  };
}

/** Deletes one of the user's schedules; another user's id deletes nothing. */
export async function deleteDepositSchedule(formData: FormData) {
  const user = await getCurrentUser();
  await db.depositSchedule.deleteMany({
    where: { id: String(formData.get("scheduleId") ?? ""), userId: user.id },
  });
  revalidatePath(PATH);
  redirect(PATH);
}
