import { redirect, unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { fullName } from "@/features/account/name";
import { getSessionUser } from "./session";

/**
 * The only place that knows who is using the app. Screens and queries depend
 * on this function, so they never read cookies or sessions themselves. The
 * session already leaves out the password hash.
 */
export const getCurrentUser = cache(async () => {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar");
  return { ...user, name: fullName(user) };
});

/**
 * Skips the login form for a valid session. A database failure leaves the form
 * on screen, because that form already reports the failure when it is used.
 */
export async function redirectIfSignedIn() {
  const user = await getSessionUser().catch((error: unknown) => {
    // Next's own signals (the end of a prerender, a redirect) are not
    // failures: let them through instead of logging them.
    unstable_rethrow(error);
    console.error("Could not read the session", error);
    return null;
  });
  if (user) redirect("/inicio");
}
