/**
 * The demo admin. Relative imports only: the seed uses it too.
 */
import { hashPassword } from "../auth/password";
import type { PrismaClient } from "../../generated/prisma/client";

export const ADMIN_EMAIL = "admin@vuelto.test";

/**
 * Replaces the admin, so running the seed twice leaves one. It is created only
 * when a password is given (`ADMIN_PASSWORD`): the repository never holds one.
 * Returns whether the admin exists afterwards.
 */
export async function seedAdmin(
  prisma: PrismaClient,
  password: string | undefined,
  email: string = ADMIN_EMAIL,
) {
  await prisma.user.deleteMany({ where: { email } });
  if (!password) return false;

  await prisma.user.create({
    data: {
      email,
      firstName: "Admin",
      lastName: "",
      passwordHash: await hashPassword(password),
      role: "ADMIN",
    },
  });
  return true;
}
