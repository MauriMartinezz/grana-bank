import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { adhereService } from "@/features/services/adhesions";
import { db } from "@/lib/db";
import { countUnreadNotifications, listNotifications, markNotificationsSeen } from "./queries";

const EMAILS = ["owner@notifications.test", "stranger@notifications.test"];
const NOW = new Date("2026-11-10T15:00:00Z");

async function createUser(email: string, alias: string, counterparty: string) {
  const user = await db.user.create({
    data: {
      email,
      firstName: "Test",
      lastName: "",
      passwordHash: "!",
      accounts: {
        create: {
          currency: "ARS",
          alias,
          balanceCents: 0,
          movements: {
            create: [
              {
                type: "RECEIVED",
                counterparty,
                amountCents: 100,
                reference: "TRF-900001",
                occurredAt: new Date("2026-11-09T12:00:00Z"),
              },
              {
                // Older than 30 days: out of the feed.
                type: "RECEIVED",
                counterparty: `${counterparty} viejo`,
                amountCents: 100,
                reference: "TRF-900002",
                occurredAt: new Date("2026-09-01T12:00:00Z"),
              },
            ],
          },
        },
      },
    },
  });
  const adhered = await adhereService(
    user.id,
    { company: "AYSA", paymentNumber: "1234567890", nickname: `Agua ${counterparty}` },
    NOW,
  );
  if (!adhered.ok) throw new Error(adhered.error);
  return { id: user.id, adhesionId: adhered.adhesionId };
}

let owner: Awaited<ReturnType<typeof createUser>>;
let stranger: Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  owner = await createUser(EMAILS[0], "owner.notifications", "Ana");
  stranger = await createUser(EMAILS[1], "stranger.notifications", "Beto");
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("listNotifications", () => {
  it("lists only the user's recent movements, failures and reminders", async () => {
    const [bill] = await db.serviceBill.findMany({ where: { adhesionId: owner.adhesionId } });
    await db.serviceBill.update({
      where: { id: bill.id },
      data: { failedAt: NOW, failureReason: "INSUFFICIENT_FUNDS" },
    });
    const due = await db.serviceBill.findFirstOrThrow({
      where: { adhesionId: owner.adhesionId, id: { not: bill.id } },
    });
    await db.serviceBill.update({
      where: { id: due.id },
      data: { dueDate: new Date("2026-11-12T00:00:00Z") },
    });
    await db.serviceAdhesion.update({ where: { id: owner.adhesionId }, data: { reminderDays: 3 } });
    await db.serviceAdhesion.update({ where: { id: stranger.adhesionId }, data: { reminderDays: 7 } });

    const titles = (await listNotifications(owner.id, NOW)).map((item) => item.title);

    expect(titles).toContain("Recibiste $1");
    expect(titles).toContain("Agua Ana vence en 2 días");
    expect(titles.some((title) => title.startsWith("No pudimos pagar Agua Ana"))).toBe(true);
    const details = (await listNotifications(owner.id, NOW)).map((item) => item.detail);
    expect(details).not.toContain("De Ana viejo");
    expect(details.join(" ")).not.toContain("Beto");
    expect(titles.join(" ")).not.toContain("Beto");
  });

  it("gives no reminders when they are off", async () => {
    const items = await listNotifications(owner.id, NOW);
    expect(items.some((item) => item.kind === "reminder")).toBe(false);
  });
});

describe("unread notifications", () => {
  it("counts everything until the user opens the screen, then nothing", async () => {
    expect(await countUnreadNotifications(owner.id, NOW)).toBe(1);
    await markNotificationsSeen(owner.id, NOW);
    expect(await countUnreadNotifications(owner.id, NOW)).toBe(0);
    expect(await countUnreadNotifications(stranger.id, NOW)).toBe(1);
  });
});
