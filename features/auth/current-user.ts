import { redirect } from "next/navigation";
import { cache } from "react";
import { getSessionUser } from "./session";

/**
 * The only place that knows who is using the app. Screens and queries depend
 * on this function, so they never read cookies or sessions themselves.
 */
export const getCurrentUser = cache(async () => {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
});

/**
 * Skips the login form for a valid session. A database failure leaves the form
 * on screen, because that form already reports the failure when it is used.
 */
export async function redirectIfSignedIn() {
  const user = await getSessionUser().catch((error) => {
    console.error("Could not read the session", error);
    return null;
  });
  if (user) redirect("/home");
}
