"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isValidEmail, normalizeEmail } from "./email";
import { verifyPassword } from "./password";
import { createSession, deleteSession } from "./session";

export type LoginState =
  | {
      // Returned because React resets the form after the action runs.
      email: string;
      remember: boolean;
      errors: { email?: string; password?: string; form?: string };
    }
  | undefined;

// Unknown emails verify against this value, so response time does not reveal
// whether an account exists.
const UNUSABLE_HASH = `${"00".repeat(16)}:${"00".repeat(64)}`;

async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  const valid = await verifyPassword(
    password,
    user?.passwordHash ?? UNUSABLE_HASH,
  );
  return valid ? user : null;
}

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";

  const errors: NonNullable<LoginState>["errors"] = {};
  if (!email) errors.email = "Ingresá tu email.";
  else if (!isValidEmail(email)) {
    errors.email = "Ingresá un email válido.";
  }
  if (!password) errors.password = "Ingresá tu contraseña.";
  if (Object.keys(errors).length > 0) return { email, remember, errors };

  try {
    const user = await authenticate(email, password);
    if (!user) {
      return {
        email,
        remember,
        errors: { form: "Email o contraseña incorrectos." },
      };
    }
    await createSession(user.id, remember);
  } catch (error) {
    console.error("Login failed", error);
    return {
      email,
      remember,
      errors: { form: "No pudimos iniciar sesión. Probá de nuevo." },
    };
  }

  // Outside the try block: redirect() works by throwing.
  redirect("/home");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
