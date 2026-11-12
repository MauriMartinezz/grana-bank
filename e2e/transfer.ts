import { expect, type Page } from "@playwright/test";

/**
 * Sends a peso transfer by alias from the signed-in user, through Transferir →
 * Nuevo destinatario, and waits for the receipt.
 */
export async function transferByAlias(
  page: Page,
  { alias, amount, note, category }: { alias: string; amount: string; note?: string; category?: string },
) {
  await page.goto("/transferir/nuevo");
  await page.getByLabel("Alias del destinatario").fill(alias);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "¿Cuánto querés transferir?" })).toBeVisible();
  await page.getByLabel(/^Monto en/).fill(amount);
  if (note) await page.getByLabel(/^Nota/).fill(note);
  if (category) await page.getByLabel(/^Categoría/).selectOption({ label: category });
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("button", { name: "Confirmar transferencia" }).click();
  await expect(page.getByRole("heading", { name: "¡Transferencia enviada!" })).toBeVisible();
}
