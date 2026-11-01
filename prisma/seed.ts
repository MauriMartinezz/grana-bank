import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../features/auth/password";
import { PrismaClient, MovementType } from "../generated/prisma/client";

const { SUBSCRIPTION, RECEIVED, SENT } = MovementType;

const movements: Array<[MovementType, string, number, string]> = [
  [SUBSCRIPTION, "Adobe", 12500, "2026-10-30T14:20:00Z"],
  [RECEIVED, "Ronaldo", 9500, "2026-10-29T11:05:00Z"],
  [SUBSCRIPTION, "Figma", 12500, "2026-10-27T09:30:00Z"],
  [SENT, "Juan Perez", 9500, "2026-10-25T18:45:00Z"],
  [RECEIVED, "Martin Bozzini", 9500, "2026-10-24T16:10:00Z"],
  [RECEIVED, "José Suárez", 9500, "2026-10-22T10:00:00Z"],
  [SENT, "Juan Rodríguez", 9500, "2026-10-20T20:15:00Z"],
  [RECEIVED, "Julio César", 9500, "2026-10-18T13:40:00Z"],
  [SENT, "Mariano Martinez", 9500, "2026-10-15T08:25:00Z"],
  [RECEIVED, "Juan David", 9500, "2026-10-12T17:55:00Z"],
  [SUBSCRIPTION, "Spotify", 1299, "2026-10-10T07:00:00Z"],
  [SUBSCRIPTION, "Netflix", 1999, "2026-10-05T07:00:00Z"],
];

async function main() {
  // Read from the environment so the password never lives in the repository.
  const password = process.env.SEED_USER_PASSWORD;
  if (!password) {
    throw new Error(
      "Set SEED_USER_PASSWORD to the password from the challenge brief.",
    );
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  // Deleting the user cascades to its account and movements,
  // so running the seed twice leaves the same data.
  const email = "soygranate@clublanus.com";
  await prisma.user.deleteMany({ where: { email } });

  await prisma.user.create({
    data: {
      email,
      name: "Granate",
      passwordHash: await hashPassword(password),
      account: {
        create: {
          currency: "USD",
          balanceCents: 97885,
          cardBrand: "MASTERCARD",
          cardLast4: "1234",
          cardHolder: "Soy Granate",
          cardExpiry: "02/30",
          movements: {
            create: movements.map(
              ([type, counterparty, amountCents, occurredAt], index) => ({
                type,
                counterparty,
                amountCents,
                reference: `GB-${String(100001 + index)}`,
                occurredAt: new Date(occurredAt),
              }),
            ),
          },
        },
      },
    },
  });

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
