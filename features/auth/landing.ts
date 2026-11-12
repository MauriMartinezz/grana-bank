import type { UserRole } from "@/generated/prisma/client";

/** Where a user lands after signing in: an admin manages promotions. */
export function landingPath(role: UserRole) {
  return role === "ADMIN" ? "/admin/promociones" : "/inicio";
}
