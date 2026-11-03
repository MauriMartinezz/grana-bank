/**
 * Rules of category names and transfer notes. Pure and free of server
 * imports, so forms check the same rules while the user types.
 */

export const CATEGORY_NAME_MAX_LENGTH = 30;
export const NOTE_MAX_LENGTH = 140;

/** Every user starts with these; they can rename, delete or add more. */
export const DEFAULT_CATEGORIES = ["Alquiler", "Comida", "Servicios", "Regalos", "Otros"] as const;

export const CATEGORY_MESSAGES = {
  nameEmpty: "Escribí un nombre para la categoría.",
  nameTooLong: `El nombre tiene hasta ${CATEGORY_NAME_MAX_LENGTH} caracteres.`,
  nameTaken: "Ya tenés una categoría con ese nombre.",
  noteTooLong: `La nota tiene hasta ${NOTE_MAX_LENGTH} caracteres.`,
} as const;

/** Trims and joins repeated spaces: `  Comida   afuera ` is `Comida afuera`. */
export function normalizeCategoryName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/** The stored key that makes names unique per user, ignoring case. */
export function categoryKey(name: string): string {
  return normalizeCategoryName(name).toLocaleLowerCase("es-AR");
}

export function validateCategoryName(
  input: string,
): { ok: true; name: string; key: string } | { ok: false; error: string } {
  const name = normalizeCategoryName(input);
  if (!name) return { ok: false, error: CATEGORY_MESSAGES.nameEmpty };
  if ([...name].length > CATEGORY_NAME_MAX_LENGTH) {
    return { ok: false, error: CATEGORY_MESSAGES.nameTooLong };
  }
  return { ok: true, name, key: categoryKey(name) };
}

/** A note with its outer spaces trimmed, or null when it is empty. */
export function normalizeNote(input: string): string | null {
  const note = input.trim();
  return note === "" ? null : note;
}

export function validateNote(
  input: string,
): { ok: true; note: string | null } | { ok: false; error: string } {
  const note = normalizeNote(input);
  if (note !== null && [...note].length > NOTE_MAX_LENGTH) {
    return { ok: false, error: CATEGORY_MESSAGES.noteTooLong };
  }
  return { ok: true, note };
}

/** The rows that give a user the default categories. */
export function defaultCategoryRows() {
  return DEFAULT_CATEGORIES.map((name) => ({ name, key: categoryKey(name) }));
}
