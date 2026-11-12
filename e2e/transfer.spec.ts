import { expect, test } from "@playwright/test";
import { login, USERS } from "./auth";
import { transferByAlias } from "./transfer";

test("a transfer from Lucía arrives on Martín's side", async ({ browser }) => {
  const note = `e2e ${Date.now()}`;

  const lucia = await browser.newContext();
  const luciaPage = await lucia.newPage();
  await login(luciaPage, USERS.lucia);
  await transferByAlias(luciaPage, { alias: "martin.gomez", amount: "1500", note });
  await lucia.close();

  // A fresh context: Martín signs in with no cookie of Lucía's.
  const martin = await browser.newContext();
  const page = await martin.newPage();
  await login(page, USERS.martin);
  await page.goto("/movimientos");
  await page.getByRole("link", { name: /Lucía Fernández/ }).first().click();

  await expect(page.getByRole("heading", { name: "Detalle" })).toBeVisible();
  await expect(page.getByText(note)).toBeVisible();
  await martin.close();
});
