import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateAccountScreens } from "@/features/account/revalidate";
import { processScheduledPayments } from "@/features/services/scheduled-payments";

/**
 * Runs the scheduled and automatic service payments of every user. Meant for
 * a cron (for example Vercel Cron, which sends `GET` with
 * `Authorization: Bearer $CRON_SECRET`). Outside the proxy matcher: it has no
 * session, only the secret, and refuses everything while the secret is unset.
 */

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Hashing gives equal lengths, so the comparison takes constant time.
  const given = request.headers.get("authorization") ?? "";
  return timingSafeEqual(digest(given), digest(`Bearer ${secret}`));
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await processScheduledPayments({ now: new Date() });
    if (summary.paid > 0) revalidateAccountScreens();
    return Response.json(summary);
  } catch (error) {
    console.error("Scheduled payments run failed", error);
    return Response.json({ error: "Scheduled payments failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
