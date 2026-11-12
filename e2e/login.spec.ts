import { expect, test } from "@playwright/test";
import { login, USERS } from "./auth";

test("a user signs in and lands on Inicio", async ({ page }) => {
  await login(page, USERS.lucia);

  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page).toHaveTitle(/Inicio/);
  await expect(page.getByRole("heading", { level: 1, name: "Lucía Fernández" })).toBeVisible();
});

test("the admin signs in and lands on Administración → Promociones", async ({ page }) => {
  await login(page, USERS.admin);

  await expect(page).toHaveURL(/\/admin\/promociones$/);
  await expect(page.getByText("Administración")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Promociones" })).toBeVisible();
});
