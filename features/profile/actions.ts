"use server";

import { revalidatePath } from "next/cache";
import { RedirectType, redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";
import { hashPassword, verifyPassword } from "@/features/auth/password";
import { otherSessionsWhere } from "@/features/auth/session";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  PROFILE_MESSAGES,
  parsePreferredCurrency,
  profileSavedPath,
  validateAlias,
  validateNewEmail,
  validateNewPassword,
  validatePersonalData,
  type PersonalData,
  type PersonalDataErrors,
  type SavedKey,
} from "./validation";

// Every error state keeps the typed values, because React resets the form
// after an action. A successful save redirects to the Perfil summary instead.
export type ProfileState =
  | { values: PersonalData; errors: PersonalDataErrors & { form?: string } }
  | undefined;
export type EmailState =
  | { value: string; errors: { email?: string; password?: string; form?: string } }
  | undefined;
export type FieldState = { value: string; error?: string } | undefined;
// Passwords are never sent back to the browser, so this state only has errors.
export type PasswordState =
  | { errors: { current?: string; next?: string; confirmation?: string; form?: string } }
  | undefined;

const SAVE_FAILED = "No pudimos guardar los cambios. Probá de nuevo.";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// The name, alias and currency show up on Home, transfers and here. Replacing
// the history entry keeps Back on the summary from reopening the change screen.
// Called outside try/catch, because redirect works by throwing.
function backToProfile(saved: SavedKey): never {
  revalidatePath("/", "layout");
  redirect(profileSavedPath(saved), RedirectType.replace);
}

export async function updateProfile(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await getCurrentUser();
  const { values, errors } = validatePersonalData({
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    address: text(formData, "address"),
    phone: text(formData, "phone"),
  });
  if (Object.keys(errors).length > 0) return { values, errors };

  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        firstName: values.firstName,
        lastName: values.lastName,
        address: values.address || null,
        phone: values.phone || null,
      },
    });
  } catch (error) {
    console.error("Profile update failed", error);
    return { values, errors: { form: SAVE_FAILED } };
  }
  backToProfile("datos");
}

export async function updatePreferredCurrency(
  _previous: FieldState,
  formData: FormData,
): Promise<FieldState> {
  const user = await getCurrentUser();
  const value = text(formData, "currency");

  try {
    const accounts = await db.account.findMany({
      where: { userId: user.id },
      select: { currency: true },
    });
    const currency = parsePreferredCurrency(
      value,
      accounts.map((account) => account.currency),
    );
    if (!currency) return { value, error: PROFILE_MESSAGES.currencyInvalid };

    await db.user.update({ where: { id: user.id }, data: { preferredCurrency: currency } });
  } catch (error) {
    console.error("Preferred currency update failed", error);
    return { value, error: SAVE_FAILED };
  }
  backToProfile("moneda");
}

/** The email signs the user in, so changing it asks for the current password. */
export async function updateEmail(
  _previous: EmailState,
  formData: FormData,
): Promise<EmailState> {
  const user = await getCurrentUser();
  // The password is never returned in the state.
  const password = text(formData, "password");
  const email = validateNewEmail(text(formData, "email"));
  const value = email.value;

  const errors: NonNullable<EmailState>["errors"] = {};
  if (email.error) errors.email = email.error;
  if (!password) errors.password = PROFILE_MESSAGES.passwordEmpty;
  if (Object.keys(errors).length > 0) return { value, errors };

  try {
    const stored = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { email: true, passwordHash: true },
    });
    if (!(await verifyPassword(password, stored.passwordHash))) {
      return { value, errors: { password: PROFILE_MESSAGES.passwordWrong } };
    }
    if (stored.email === value) {
      return { value, errors: { email: PROFILE_MESSAGES.emailSame } };
    }
    // The unique index decides, so two people can never end up with one email.
    await db.user.update({ where: { id: user.id }, data: { email: value } });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { value, errors: { email: PROFILE_MESSAGES.emailTaken } };
    }
    console.error("Email update failed", error);
    return { value, errors: { form: SAVE_FAILED } };
  }
  backToProfile("email");
}

export async function updateAlias(
  _previous: FieldState,
  formData: FormData,
): Promise<FieldState> {
  const user = await getCurrentUser();
  const accountId = text(formData, "accountId");
  const { value, error } = validateAlias(text(formData, "alias"));
  if (error) return { value, error };

  try {
    // Filtering by owner means another user's account id updates nothing.
    const { count } = await db.account.updateMany({
      where: { id: accountId, userId: user.id },
      data: { alias: value },
    });
    if (count === 0) return { value, error: PROFILE_MESSAGES.accountNotFound };
  } catch (error) {
    // The unique index decides, even when two people save the same alias at once.
    if (isUniqueViolation(error)) return { value, error: PROFILE_MESSAGES.aliasTaken };
    console.error("Alias update failed", error);
    return { value, error: SAVE_FAILED };
  }
  backToProfile("alias");
}

/**
 * Changing the password signs out every other browser, so whoever knew the old
 * one loses access; this browser stays signed in.
 */
export async function changePassword(
  _previous: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const user = await getCurrentUser();
  const current = text(formData, "current");
  const next = text(formData, "next");

  const errors: NonNullable<PasswordState>["errors"] = validateNewPassword(
    next,
    text(formData, "confirmation"),
  );
  if (!current) errors.current = PROFILE_MESSAGES.passwordEmpty;
  if (Object.keys(errors).length > 0) return { errors };

  try {
    const stored = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!(await verifyPassword(current, stored.passwordHash))) {
      return { errors: { current: PROFILE_MESSAGES.currentPasswordWrong } };
    }
    if (next === current) return { errors: { next: PROFILE_MESSAGES.newPasswordSame } };

    const passwordHash = await hashPassword(next);
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash } }),
      db.session.deleteMany({ where: await otherSessionsWhere(user.id) }),
    ]);
  } catch (error) {
    console.error("Password change failed", error);
    return { errors: { form: SAVE_FAILED } };
  }
  backToProfile("contrasena");
}
