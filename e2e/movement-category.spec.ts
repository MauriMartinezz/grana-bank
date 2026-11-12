import { expect, test } from "@playwright/test";
import { login, USERS } from "./auth";

// A seeded movement of Lucía: the seed dates it 2026-10-15, so it counts in
// Finanzas for October 2026 whatever the current month is.
const MOVEMENT = "Mariano Martinez";
const MOVEMENT_MONTH = "2026-10";

test("the saved category stays selected after saving and after a reload", async ({ page }) => {
  await login(page, USERS.lucia);
  await page.goto("/movimientos");
  await page.getByRole("link", { name: new RegExp(MOVEMENT) }).click();
  await expect(page.getByRole("heading", { name: "Detalle" })).toBeVisible();

  const category = page.getByLabel(/^Categoría/);
  await expect(category.locator("option:checked")).toHaveText("Sin categoría");
  await category.selectOption({ label: "Comida" });
  await page.getByRole("button", { name: "Guardar" }).click();

  // Only once the action answered: until then the select shows what the user picked.
  await expect(page.getByRole("status")).toHaveText("Categoría guardada.");
  await expect(category.locator("option:checked")).toHaveText("Comida");

  await page.reload();
  await expect(page.getByLabel(/^Categoría/).locator("option:checked")).toHaveText("Comida");

  // Finanzas for the movement's month counts it under Comida.
  await page.goto(`/finanzas?mes=${MOVEMENT_MONTH}`);
  const comida = page
    .getByRole("list", { name: "Gastos por categoría" })
    .getByRole("listitem")
    .filter({ has: page.getByText("Comida", { exact: true }) });
  await expect(comida).toContainText("1 movimiento");
  await comida.getByText("Comida", { exact: true }).click();
  await expect(comida.getByRole("link", { name: new RegExp(MOVEMENT) })).toBeVisible();
});
