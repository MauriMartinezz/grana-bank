"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validatePromotion, type PromotionErrors, type PromotionInput } from "@/features/promotions/validation";
import { db } from "@/lib/db";
import { requireAdmin } from "./guard";

/** What the form gets back after a failed submit: what was typed and why it failed. */
export type CreatePromotionState =
  | { values: PromotionInput; errors: PromotionErrors & { form?: string } }
  | undefined;

const FAILED = "No pudimos crear la promoción. Probá de nuevo.";

function readInput(formData: FormData): PromotionInput {
  const field = (name: string) => String(formData.get(name) ?? "");
  return {
    bank: field("bank"),
    cardBrand: field("cardBrand"),
    merchant: field("merchant"),
    category: field("category"),
    weekdays: formData.getAll("weekdays").map(String),
    percent: field("percent"),
    cap: field("cap"),
    noCap: formData.get("noCap") === "on",
    minimum: field("minimum"),
    noMinimum: formData.get("noMinimum") === "on",
    validFrom: field("validFrom"),
    validUntil: field("validUntil"),
    conditions: field("conditions"),
  };
}

/** Creates a promotion. Only an admin: anyone else is refused before reading the form. */
export async function createPromotion(
  _previous: CreatePromotionState,
  formData: FormData,
): Promise<CreatePromotionState> {
  await requireAdmin();

  const values = readInput(formData);
  const result = validatePromotion(values);
  if (!result.ok) return { values, errors: result.errors };

  try {
    await db.promotion.create({ data: result.promotion });
  } catch (error) {
    console.error("Promotion creation failed", error instanceof Error ? error.message : error);
    return { values, errors: { form: FAILED } };
  }

  revalidatePath("/promociones");
  revalidatePath("/inicio");
  revalidatePath("/admin/promociones");
  // Outside the try block: redirect() works by throwing.
  redirect("/admin/promociones");
}
