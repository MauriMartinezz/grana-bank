"use server";

import { revalidateAccountScreens } from "@/features/account/revalidate";
import { getCurrentUser } from "@/features/auth/current-user";
import { markNotificationsSeen } from "./queries";

/** Marks the signed-in user's notifications as seen, so the bell shows none. */
export async function markMyNotificationsSeen() {
  const user = await getCurrentUser();
  await markNotificationsSeen(user.id, new Date());
  revalidateAccountScreens();
}
