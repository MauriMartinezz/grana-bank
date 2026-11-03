import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { CATEGORY_MESSAGES, validateCategoryName } from "./names";

export type CategoryResult = { ok: true } | { ok: false; error: string };

export const CATEGORY_NOT_FOUND = "Esta categoría ya no está disponible.";
export const MOVEMENT_NOT_FOUND = "Este movimiento ya no está disponible.";

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** The user's categories, by name ignoring case. */
export function listCategories(userId: string) {
  return db.category.findMany({
    where: { userId },
    orderBy: [{ key: "asc" }, { id: "asc" }],
    select: { id: true, name: true },
  });
}

/** Whether `categoryId` is one of the user's categories. */
export async function isOwnCategory(
  client: Prisma.TransactionClient,
  userId: string,
  categoryId: string,
) {
  return (await client.category.count({ where: { id: categoryId, userId } })) === 1;
}

export async function createCategory(
  userId: string,
  input: string,
): Promise<{ ok: true; categoryId: string } | { ok: false; error: string }> {
  const valid = validateCategoryName(input);
  if (!valid.ok) return valid;
  try {
    const { id } = await db.category.create({
      data: { userId, name: valid.name, key: valid.key },
    });
    return { ok: true, categoryId: id };
  } catch (error) {
    // The unique index decides, so two saves at once cannot both pass.
    if (isUniqueViolation(error)) return { ok: false, error: CATEGORY_MESSAGES.nameTaken };
    throw error;
  }
}

export async function renameCategory(
  userId: string,
  categoryId: string,
  input: string,
): Promise<CategoryResult> {
  const valid = validateCategoryName(input);
  if (!valid.ok) return valid;
  try {
    const { count } = await db.category.updateMany({
      where: { id: categoryId, userId },
      data: { name: valid.name, key: valid.key },
    });
    return count === 1 ? { ok: true } : { ok: false, error: CATEGORY_NOT_FOUND };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: CATEGORY_MESSAGES.nameTaken };
    throw error;
  }
}

/** Deletes the user's category; its movements stay, uncategorized. */
export async function deleteCategory(userId: string, categoryId: string): Promise<CategoryResult> {
  const { count } = await db.category.deleteMany({ where: { id: categoryId, userId } });
  return count === 1 ? { ok: true } : { ok: false, error: CATEGORY_NOT_FOUND };
}

/**
 * Sets the category of one of the user's movements, or clears it with null.
 * The category is private to the movement's owner, so both must be theirs.
 */
export async function setMovementCategory(
  userId: string,
  movementId: string,
  categoryId: string | null,
): Promise<CategoryResult> {
  return db.$transaction(async (tx) => {
    if (categoryId !== null && !(await isOwnCategory(tx, userId, categoryId))) {
      return { ok: false, error: CATEGORY_NOT_FOUND };
    }
    const { count } = await tx.movement.updateMany({
      where: { id: movementId, account: { userId } },
      data: { categoryId },
    });
    return count === 1 ? { ok: true } : { ok: false, error: MOVEMENT_NOT_FOUND };
  });
}
