import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../features/auth/password";
import { defaultCategoryRows } from "../features/categories/names";
import { TEST_ACCOUNT } from "../features/deposits/test-account";
import { simulatedBills } from "../features/services/bills";
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

type SeedAccount = {
  currency: "ARS" | "USD";
  alias: string;
  balanceCents: number | bigint;
  card?: { brand: "MASTERCARD" | "VISA"; last4: string; expiry: string };
};

/** People who exist to receive transfers in the demo. */
const recipients: Array<{
  email: string;
  firstName: string;
  lastName: string;
  accounts: SeedAccount[];
}> = [
  {
    email: "juanperez@clublanus.com",
    firstName: "Juan",
    lastName: "Perez",
    accounts: [
      {
        currency: "ARS",
        alias: "juan.perez",
        balanceCents: 25000,
        card: { brand: "VISA", last4: "4821", expiry: "08/29" },
      },
      // Lets the demo show a transfer in dollars.
      { currency: "USD", alias: "juan.perez.usd", balanceCents: 0 },
    ],
  },
  {
    email: "martinbozzini@clublanus.com",
    firstName: "Martin",
    lastName: "Bozzini",
    accounts: [
      {
        currency: "ARS",
        alias: "martin.bozzini",
        balanceCents: 18000,
        card: { brand: "VISA", last4: "7390", expiry: "08/29" },
      },
    ],
  },
];

function accountData({ currency, alias, balanceCents, card }: SeedAccount, holder: string) {
  return {
    currency,
    alias,
    balanceCents,
    cards: card && {
      create: { brand: card.brand, last4: card.last4, holder, expiry: card.expiry },
    },
  };
}

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

  // Deleting the users cascades to their accounts, cards, movements,
  // transfers, exchanges, contacts, SUBE cards, top-ups and adhered services
  // with their bills and payments, so running the seed twice leaves the same
  // data. Users are matched by email and by seeded alias, so a seeded
  // user who changed their email in Perfil is replaced too.
  const email = "soygranate@clublanus.com";
  const seededAliases = [
    "soy.granate",
    "soy.granate.usd",
    ...recipients.flatMap((r) => r.accounts.map((a) => a.alias)),
    ...TEST_ACCOUNT.accounts.map((a) => a.alias),
  ];
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { in: [email, TEST_ACCOUNT.email, ...recipients.map((r) => r.email)] } },
        { accounts: { some: { alias: { in: seededAliases } } } },
      ],
    },
  });

  // Every seeded user logs in with the same password, so the demo can show
  // a transfer arriving on the other side.
  const passwordHash = await hashPassword(password);

  const created = await Promise.all(
    recipients.map(({ email, firstName, lastName, accounts }) =>
      prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash,
          categories: { create: defaultCategoryRows() },
          accounts: {
            create: accounts.map((account) =>
              accountData(account, `${firstName} ${lastName}`),
            ),
          },
        },
        include: { accounts: true },
      }),
    ),
  );
  const juanPesos = created[0].accounts.find((a) => a.currency === "ARS")!;

  const holder = "Soy Granate";
  const granate = await prisma.user.create({
    data: {
      email,
      firstName: "Soy",
      lastName: "Granate",
      passwordHash,
      categories: { create: defaultCategoryRows() },
      // Only Juan's peso account starts as a contact; Martin shows the
      // "new recipient" flow.
      contacts: { create: { contactAccountId: juanPesos.id } },
      // One saved SUBE card, so Recargas shows the list and the top-up flow.
      subeCards: { create: { number: "6061234567890123", nickname: "sube de mauri" } },
      // One adhered service with its two simulated pending bills, so
      // Servicios shows bills to pay.
      serviceAdhesions: {
        create: {
          company: "EDESUR",
          paymentNumber: "0012345678",
          nickname: "Luz depto",
          bills: { create: simulatedBills("EDESUR", "0012345678") },
        },
      },
      accounts: {
        create: [
          {
            ...accountData(
              {
                currency: "ARS",
                alias: "soy.granate",
                // $2.500.000, so the demo can buy dollars.
                balanceCents: 250_000_000,
                card: { brand: "MASTERCARD", last4: "1234", expiry: "02/30" },
              },
              holder,
            ),
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
          accountData(
            {
              currency: "USD",
              alias: "soy.granate.usd",
              balanceCents: 25000,
              card: { brand: "VISA", last4: "5678", expiry: "11/29" },
            },
            holder,
          ),
        ],
      },
    },
    include: { accounts: { include: { cards: true } } },
  });

  // The "Cuenta de prueba" that funds Ingresar dinero. It cannot sign in:
  // the flag keeps it out, and "!" is no valid password hash anyway.
  await prisma.user.create({
    data: {
      email: TEST_ACCOUNT.email,
      firstName: TEST_ACCOUNT.firstName,
      lastName: "",
      passwordHash: "!",
      isTestAccount: true,
      accounts: {
        create: TEST_ACCOUNT.accounts.map(({ currency, alias }) => ({
          currency,
          alias,
          balanceCents: TEST_ACCOUNT.balanceCents,
        })),
      },
    },
  });

  // Seeded movements went through their account's card, like a transfer.
  for (const { id, cards } of granate.accounts) {
    if (cards[0]) {
      await prisma.movement.updateMany({
        where: { accountId: id },
        data: { cardId: cards[0].id },
      });
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
