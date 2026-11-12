/**
 * Settings shared by playwright.config.ts, the database setup and the specs.
 * The suite runs against its own database, never the dev database `vuelto`.
 */
export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

export const E2E_DATABASE_NAME = "vuelto_e2e";
export const E2E_DATABASE_URL = `postgresql://vuelto:vuelto@localhost:5433/${E2E_DATABASE_NAME}`;
/** The maintenance database the setup connects to in order to create `vuelto_e2e`. */
export const E2E_ADMIN_DATABASE_URL = "postgresql://vuelto:vuelto@localhost:5433/postgres";

// TEST-ONLY passwords for the throwaway `vuelto_e2e` database, which the
// setup re-seeds on every run. They protect nothing real and are never used
// for the dev database or any deployment.
export const E2E_USER_PASSWORD = "e2e-only-user-password";
export const E2E_ADMIN_PASSWORD = "e2e-only-admin-password";
