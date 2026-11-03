export const MAX_ALIAS_LENGTH = 40;

// Letters without accents, digits and dots. The database has the same rule
// as a CHECK constraint (migration add_account_alias).
const ALIAS_PATTERN = /^[a-z0-9.]+$/;
const HAS_LETTER = /[a-z]/;

/** Aliases ignore case, so they are stored and compared in lower case. */
export function normalizeAlias(input: string) {
  return input.trim().toLowerCase();
}

/** Expects a normalized alias. */
export function isValidAlias(alias: string) {
  return (
    alias.length > 0 &&
    alias.length <= MAX_ALIAS_LENGTH &&
    ALIAS_PATTERN.test(alias) &&
    HAS_LETTER.test(alias)
  );
}
