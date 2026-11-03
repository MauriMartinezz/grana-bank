import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { simulatedBills } from "./bills";
import type { Adhesion } from "./companies";

/**
 * Adheres a validated service with its simulated pending bills, in one
 * insert. The unique (user, company, number) index rejects a duplicate, also
 * when two submits race.
 */
export async function adhereService(
  userId: string,
  adhesion: Adhesion,
  now: Date = new Date(),
): Promise<{ ok: true; adhesionId: string } | { ok: false; error: "DUPLICATE" }> {
  try {
    const created = await db.serviceAdhesion.create({
      data: {
        userId,
        ...adhesion,
        bills: { create: simulatedBills(adhesion.company, adhesion.paymentNumber, now) },
      },
      select: { id: true },
    });
    return { ok: true, adhesionId: created.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "DUPLICATE" };
    }
    throw error;
  }
}
