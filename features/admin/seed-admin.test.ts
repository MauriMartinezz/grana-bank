import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { verifyPassword } from "@/features/auth/password";
import { ADMIN_EMAIL, seedAdmin } from "./seed-admin";

// Not the real admin email, so the tests never touch the demo admin.
const EMAIL = "admin@seed-admin.test";
const PASSWORD = "Fixture-Admin1@";

const admins = () => db.user.findMany({ where: { email: EMAIL } });

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
});

describe("seedAdmin", () => {
  it("is admin@vuelto.test by default", () => {
    expect(ADMIN_EMAIL).toBe("admin@vuelto.test");
  });

  it("creates the admin with a hash of ADMIN_PASSWORD", async () => {
    await expect(seedAdmin(db, PASSWORD, EMAIL)).resolves.toBe(true);

    const [admin] = await admins();
    expect(admin).toMatchObject({ email: EMAIL, role: "ADMIN", isTestAccount: false });
    expect(admin.passwordHash).not.toContain(PASSWORD);
    await expect(verifyPassword(PASSWORD, admin.passwordHash)).resolves.toBe(true);
  });

  it("creates no admin without a password", async () => {
    await expect(seedAdmin(db, undefined, EMAIL)).resolves.toBe(false);
    await expect(seedAdmin(db, "", EMAIL)).resolves.toBe(false);
    expect(await admins()).toEqual([]);
  });

  it("leaves one admin when run twice", async () => {
    await seedAdmin(db, PASSWORD, EMAIL);
    await seedAdmin(db, "Other-Admin2@", EMAIL);

    const rows = await admins();
    expect(rows).toHaveLength(1);
    await expect(verifyPassword("Other-Admin2@", rows[0].passwordHash)).resolves.toBe(true);
  });
});
