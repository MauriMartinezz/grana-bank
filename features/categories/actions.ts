"use server";

import { redirect } from "next/navigation";
import { revalidateAccountScreens } from "@/features/account/revalidate";
import { getCurrentUser } from "@/features/auth/current-user";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  setMovementCategory,
} from "./categories";
import { normalizeCategoryName } from "./names";

/** The typed name comes back with an error, because React resets the form. */
export type CategoryFormState = { notice: string } | { error: string; value: string } | undefined;
export type MovementCategoryState = { notice: string } | { error: string } | undefined;

const SAVE_FAILED = "No pudimos guardar la categoría. Probá de nuevo.";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

export async function addCategory(
  _previous: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const user = await getCurrentUser();
  const value = text(formData, "name");
  let result;
  try {
    result = await createCategory(user.id, value);
  } catch (error) {
    console.error("Category creation failed", error);
    return { error: SAVE_FAILED, value };
  }
  if (!result.ok) return { error: result.error, value };
  revalidateAccountScreens();
  return { notice: `Agregamos ${normalizeCategoryName(value)}.` };
}

export async function saveCategoryName(
  _previous: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const user = await getCurrentUser();
  const value = text(formData, "name");
  let result;
  try {
    result = await renameCategory(user.id, text(formData, "categoryId"), value);
  } catch (error) {
    console.error("Category rename failed", error);
    return { error: SAVE_FAILED, value };
  }
  if (!result.ok) return { error: result.error, value };
  revalidateAccountScreens();
  return { notice: `Guardamos ${normalizeCategoryName(value)}.` };
}

/** Deletes one of the user's categories; its movements stay, uncategorized. */
export async function removeCategory(formData: FormData) {
  const user = await getCurrentUser();
  // Another user's id deletes nothing; the list shows what is left.
  await deleteCategory(user.id, text(formData, "categoryId"));
  revalidateAccountScreens();
  redirect("/perfil/categorias");
}

/** Sets or, with an empty category, clears the category of a movement. */
export async function changeMovementCategory(
  _previous: MovementCategoryState,
  formData: FormData,
): Promise<MovementCategoryState> {
  const user = await getCurrentUser();
  const categoryId = text(formData, "categoryId");
  let result;
  try {
    result = await setMovementCategory(
      user.id,
      text(formData, "movementId"),
      categoryId === "" ? null : categoryId,
    );
  } catch (error) {
    console.error("Movement category change failed", error);
    return { error: SAVE_FAILED };
  }
  if (!result.ok) return { error: result.error };
  revalidateAccountScreens();
  return { notice: "Categoría guardada." };
}
