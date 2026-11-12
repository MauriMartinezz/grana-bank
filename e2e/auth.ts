import { expect, type Page } from "@playwright/test";
import { E2E_ADMIN_PASSWORD, E2E_USER_PASSWORD } from "./env";

export const USERS = {
  lucia: "lucia.fernandez@vuelto.test",
  juan: "juanperez@vuelto.test",
  martin: "martingomez@vuelto.test",
  admin: "admin@vuelto.test",
} as const;

/** Signs in through the login form and waits until it leaves /ingresar. */
export async function login(page: Page, email: string) {
  const password = email === USERS.admin ? E2E_ADMIN_PASSWORD : E2E_USER_PASSWORD;
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).not.toHaveURL(/\/ingresar/);
}
