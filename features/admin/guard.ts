import { notFound } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";

/**
 * The server-side check of every admin page and Server Action. A visitor
 * without a session goes to login; a regular user gets not found, so the admin
 * view does not reveal it exists. The proxy only checks for a cookie.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") notFound();
  return user;
}
