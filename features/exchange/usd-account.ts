import { Prisma } from "@/generated/prisma/client";
import { isValidAlias } from "@/features/transfers/alias";
import { generateAlias } from "@/features/transfers/alias-generator";
import { db } from "@/lib/db";

const MAX_ATTEMPTS = 5;

function findUsdAccount(userId: string) {
  return db.account.findUnique({ where: { userId_currency: { userId, currency: "USD" } } });
}

/**
 * Opens the user's dollar account, empty and without cards, or returns it
 * when it already exists. Its alias is the peso alias plus ".usd" when that
 * is valid and free, otherwise three random words such as "mate.lluvia.faro".
 *
 * Concurrent calls open a single account: the unique (user, currency) pair
 * rejects the second insert, which then returns the account that won.
 */
export async function openUsdAccount(userId: string) {
  const existing = await findUsdAccount(userId);
  if (existing) return existing;

  const ars = await db.account.findUnique({
    where: { userId_currency: { userId, currency: "ARS" } },
    select: { alias: true },
  });
  const preferred = ars ? `${ars.alias}.usd` : null;
  let alias =
    preferred &&
    isValidAlias(preferred) &&
    !(await db.account.findUnique({ where: { alias: preferred }, select: { id: true } }))
      ? preferred
      : generateAlias();

  for (let attempt = 1; ; attempt++) {
    try {
      return await db.account.create({
        data: { userId, currency: "USD", alias, balanceCents: 0 },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }
      // Either another request opened the account first, or the alias was
      // taken in the meantime: return the account, or try another alias.
      const opened = await findUsdAccount(userId);
      if (opened) return opened;
      if (attempt >= MAX_ATTEMPTS) throw error;
      alias = generateAlias();
    }
  }
}
