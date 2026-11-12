import { expect, test } from "@playwright/test";
import { login, USERS } from "./auth";

test("a regular user cannot open the admin promotions", async ({ page }) => {
  await login(page, USERS.lucia);

  await page.goto("/admin/promociones");

  await expect(page.getByText("Página no encontrada")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Promociones" })).toHaveCount(0);
});

test("an anonymous visitor is sent to /ingresar", async ({ page }) => {
  await page.goto("/inicio");

  await expect(page).toHaveURL(/\/ingresar$/);
  await expect(page.getByLabel("Email")).toBeVisible();
});
