import { createHash } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { login, logout } from "./actions";
import { getCurrentUser, redirectIfSignedIn } from "./current-user";
import { hashPassword } from "./password";
import { SESSION_COOKIE } from "./session-cookie";

type StoredCookie = { value: string; options: Record<string, unknown> };

const jar = vi.hoisted(() => new Map<string, StoredCookie>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const cookie = jar.get(name);
      return cookie && { name, value: cookie.value };
    },
    set: (name: string, value: string, options: Record<string, unknown>) => {
      jar.set(name, { value, options });
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

const EMAIL = "owner@auth.test";
const PASSWORD = "Fixture-Pass1@";

let userId: string;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

function sessionCount() {
  return db.session.count({ where: { userId } });
}

const signIn = (fields = {}) =>
  login(undefined, form({ email: EMAIL, password: PASSWORD, ...fields }));

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
  const user = await db.user.create({
    data: {
      email: EMAIL,
      firstName: "Owner",
      lastName: "Flow",
      passwordHash: await hashPassword(PASSWORD),
    },
  });
  userId = user.id;
});

afterEach(async () => {
  vi.restoreAllMocks();
  jar.clear();
  await db.session.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
});

describe("login", () => {
  it("creates a session and enters the app with valid credentials", async () => {
    await expect(signIn()).rejects.toThrow("REDIRECT:/home");

    const cookie = jar.get(SESSION_COOKIE);
    expect(cookie?.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    await expect(sessionCount()).resolves.toBe(1);
  });

  it("stores only a hash of the session token", async () => {
    await expect(signIn()).rejects.toThrow("REDIRECT:");

    const token = jar.get(SESSION_COOKIE)?.value as string;
    const session = await db.session.findFirstOrThrow({ where: { userId } });
    expect(session.tokenHash).not.toBe(token);
    expect(session.tokenHash).toBe(
      createHash("sha256").update(token).digest("hex"),
    );
  });

  it("ignores case and spaces around the email", async () => {
    await expect(signIn({ email: "  Owner@AUTH.test " })).rejects.toThrow(
      "REDIRECT:/home",
    );
  });

  it("rejects a wrong password and keeps the typed email", async () => {
    await expect(signIn({ password: "wrong" })).resolves.toEqual({
      email: EMAIL,
      remember: false,
      errors: { form: "Email o contraseña incorrectos." },
    });
    expect(jar.size).toBe(0);
    await expect(sessionCount()).resolves.toBe(0);
  });

  it("keeps Recordarme after a rejected attempt", async () => {
    await expect(
      signIn({ password: "wrong", remember: "on" }),
    ).resolves.toMatchObject({ remember: true });
  });

  it("answers the same for an unknown email", async () => {
    await expect(signIn({ email: "nobody@auth.test" })).resolves.toEqual({
      email: "nobody@auth.test",
      remember: false,
      errors: { form: "Email o contraseña incorrectos." },
    });
    expect(jar.size).toBe(0);
  });

  it("asks for missing fields", async () => {
    await expect(login(undefined, form({}))).resolves.toEqual({
      email: "",
      remember: false,
      errors: {
        email: "Ingresá tu email.",
        password: "Ingresá tu contraseña.",
      },
    });
  });

  it("rejects a malformed email without looking it up", async () => {
    const findUnique = vi.spyOn(db.user, "findUnique");
    await expect(signIn({ email: "not-an-email" })).resolves.toEqual({
      email: "not-an-email",
      remember: false,
      errors: { email: "Ingresá un email válido." },
    });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects an oversized email before running the pattern", async () => {
    const email = `a@${".".repeat(200_000)}@`;
    const startedAt = performance.now();

    await expect(signIn({ email })).resolves.toMatchObject({
      errors: { email: "Ingresá un email válido." },
    });
    expect(performance.now() - startedAt).toBeLessThan(100);
  });

  it("reports a failure instead of crashing when the database is down", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(db.user, "findUnique").mockRejectedValue(new Error("offline"));
    await expect(signIn()).resolves.toEqual({
      email: EMAIL,
      remember: false,
      errors: { form: "No pudimos iniciar sesión. Probá de nuevo." },
    });
    expect(jar.size).toBe(0);
  });

  it("keeps a browser-session cookie without Recordarme", async () => {
    await expect(signIn()).rejects.toThrow("REDIRECT:");
    expect(jar.get(SESSION_COOKIE)?.options.expires).toBeUndefined();

    const session = await db.session.findFirstOrThrow({ where: { userId } });
    const hours = (session.expiresAt.getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(23);
    expect(hours).toBeLessThanOrEqual(24);
  });

  it("keeps a persistent cookie with Recordarme", async () => {
    await expect(signIn({ remember: "on" })).rejects.toThrow("REDIRECT:");

    const session = await db.session.findFirstOrThrow({ where: { userId } });
    expect(jar.get(SESSION_COOKIE)?.options.expires).toEqual(session.expiresAt);
    const days = (session.expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
  });

  it("removes the user's expired sessions", async () => {
    await db.session.create({
      data: { userId, tokenHash: "expired", expiresAt: new Date(0) },
    });
    await expect(signIn()).rejects.toThrow("REDIRECT:");
    await expect(sessionCount()).resolves.toBe(1);
  });
});

describe("getCurrentUser", () => {
  it("returns the signed-in user without the password hash", async () => {
    await expect(signIn()).rejects.toThrow("REDIRECT:");

    const user = await getCurrentUser();
    expect(user).toMatchObject({
      id: userId,
      email: EMAIL,
      firstName: "Owner",
      lastName: "Flow",
      name: "Owner Flow",
    });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("works with the production environment", async () => {
    await expect(signIn()).rejects.toThrow("REDIRECT:");
    vi.stubEnv("NODE_ENV", "production");
    try {
      await expect(getCurrentUser()).resolves.toMatchObject({ id: userId });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("sends a visitor without a cookie to login", async () => {
    await expect(getCurrentUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("sends an unknown token to login", async () => {
    jar.set(SESSION_COOKIE, { value: "forged", options: {} });
    await expect(getCurrentUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("does not accept the stored hash as a token", async () => {
    await expect(signIn()).rejects.toThrow("REDIRECT:");
    const session = await db.session.findFirstOrThrow({ where: { userId } });
    jar.set(SESSION_COOKIE, { value: session.tokenHash, options: {} });
    await expect(getCurrentUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("sends an expired session to login", async () => {
    await expect(signIn()).rejects.toThrow("REDIRECT:");
    await db.session.updateMany({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(getCurrentUser()).rejects.toThrow("REDIRECT:/login");
  });
});

describe("redirectIfSignedIn", () => {
  it("sends a signed-in user to home", async () => {
    await expect(signIn()).rejects.toThrow("REDIRECT:");
    await expect(redirectIfSignedIn()).rejects.toThrow("REDIRECT:/home");
  });

  it("keeps a visitor without a session on the page", async () => {
    await expect(redirectIfSignedIn()).resolves.toBeUndefined();
  });

  it("keeps the login page usable when the database is down", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(db.session, "findUnique").mockRejectedValue(new Error("offline"));
    jar.set(SESSION_COOKIE, { value: "stale", options: {} });
    await expect(redirectIfSignedIn()).resolves.toBeUndefined();
  });
});

describe("logout", () => {
  it("still signs out of the browser when the database is down", async () => {
    await expect(signIn()).rejects.toThrow("REDIRECT:");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(db.session, "deleteMany").mockRejectedValue(new Error("offline"));

    await expect(logout()).rejects.toThrow("REDIRECT:/login");
    expect(jar.has(SESSION_COOKIE)).toBe(false);
  });

  it("deletes the session and the cookie, so the token stops working", async () => {
    await expect(signIn()).rejects.toThrow("REDIRECT:");
    const token = jar.get(SESSION_COOKIE)?.value as string;

    await expect(logout()).rejects.toThrow("REDIRECT:/login");

    expect(jar.has(SESSION_COOKIE)).toBe(false);
    await expect(sessionCount()).resolves.toBe(0);

    jar.set(SESSION_COOKIE, { value: token, options: {} });
    await expect(getCurrentUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("works without a session", async () => {
    await expect(logout()).rejects.toThrow("REDIRECT:/login");
  });
});
