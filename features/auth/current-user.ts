import { connection } from "next/server";
import { cache } from "react";
import { db } from "@/lib/db";

const DEV_USER_EMAIL = "soygranate@clublanus.com";

/**
 * The only place that knows who is using the app. Screens and queries depend
 * on this function, so replacing the development bypass with a real session
 * does not change them.
 */
export const getCurrentUser = cache(async () => {
  // The user depends on the request, so this can never run while prerendering.
  await connection();

  if (process.env.NODE_ENV === "production") {
    throw new Error("The development login bypass cannot run in production.");
  }

  const user = await db.user.findUnique({ where: { email: DEV_USER_EMAIL } });
  if (!user) {
    throw new Error("Development user not found. Run `pnpm db:seed`.");
  }
  return user;
});
