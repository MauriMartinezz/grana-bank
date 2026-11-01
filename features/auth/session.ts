import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "./session-cookie";

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_MS = DAY_MS;
const REMEMBERED_SESSION_MS = 7 * DAY_MS;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, remember: boolean) {
  const now = Date.now();
  const expiresAt = new Date(
    now + (remember ? REMEMBERED_SESSION_MS : SESSION_MS),
  );
  const token = randomBytes(32).toString("base64url");

  await db.session.deleteMany({
    where: { userId, expiresAt: { lte: new Date(now) } },
  });
  await db.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Without an expiry the browser drops the cookie when it closes.
    expires: remember ? expiresAt : undefined,
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { omit: { passwordHash: true } } },
  });
  if (!session || session.expiresAt <= new Date()) return null;

  return session.user;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}
