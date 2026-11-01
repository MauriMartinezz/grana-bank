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
