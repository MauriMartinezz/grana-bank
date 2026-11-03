import { revalidatePath } from "next/cache";

/**
 * Refreshes every signed-in screen after a balance, account or profile
 * change: Home, Movimientos, Transferir, Dólares, Tarjetas and Perfil all
 * live under the `(app)` route group and show some of that data.
 *
 * Scoped to the group instead of the root layout, so the login page under
 * `(auth)` is not revalidated and re-prerendered on every save.
 */
export function revalidateAccountScreens() {
  revalidatePath("/(app)", "layout");
}
