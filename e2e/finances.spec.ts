import { expect, test } from "@playwright/test";
import { login, USERS } from "./auth";
import { transferByAlias } from "./transfer";

test("Finanzas shows the seeded budgets and a spending-bar segment opens its group", async ({
  page,
}) => {
  await login(page, USERS.lucia);
  // The seeded movements are dated October 2026 and have no category: spend
  // under Comida now, so the current month has a Comida segment.
  await transferByAlias(page, { alias: "juan.perez", amount: "1000", category: "Comida" });

  await page.goto("/finanzas");
  await expect(page.getByRole("heading", { level: 1, name: "Finanzas personales" })).toBeVisible();

  const groups = page.getByRole("list", { name: "Gastos por categoría" });
  const group = (name: string) =>
    groups.getByRole("listitem").filter({ has: page.getByText(name, { exact: true }) });
  await expect(group("Comida")).toContainText(/de \$300\.000/);
  await expect(group("Servicios")).toContainText(/de \$80\.000/);

  // Closed until its segment is clicked.
  const movement = group("Comida").getByRole("link", { name: /Juan Perez/ });
  await expect(movement).toBeHidden();

  await page
    .getByRole("list", { name: "Gastos del mes por categoría" })
    .getByRole("link", { name: /^Comida:/ })
    .click();

  await expect(page).toHaveURL(/categoria=/);
  await expect(movement).toBeVisible();
});
