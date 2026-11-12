/**
 * Prepares the e2e database before the app under test starts: creates
 * `vuelto_e2e` when missing, applies the migrations and re-seeds it, so every
 * run starts from the same data and tests that write stay independent.
 *
 * It runs as the first step of Playwright's `webServer` command (see
 * playwright.config.ts): `next build` and `next start` need the migrated
 * database, and the command guarantees this runs before them.
 */
import { execFileSync } from "node:child_process";
import { Client } from "pg";
import {
  E2E_ADMIN_DATABASE_URL,
  E2E_ADMIN_PASSWORD,
  E2E_DATABASE_NAME,
  E2E_DATABASE_URL,
  E2E_USER_PASSWORD,
} from "./env";

async function createDatabaseIfMissing() {
  const client = new Client({ connectionString: E2E_ADMIN_DATABASE_URL });
  await client.connect();
  try {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      E2E_DATABASE_NAME,
    ]);
    if (!rowCount) {
      // An identifier cannot be a query parameter; the name is a constant.
      await client.query(`CREATE DATABASE "${E2E_DATABASE_NAME}"`);
      console.log(`[e2e] Created database ${E2E_DATABASE_NAME}.`);
    }
  } finally {
    await client.end();
  }
}

function prisma(...args: string[]) {
  execFileSync("pnpm", ["exec", "prisma", ...args], {
    stdio: "inherit",
    env: {
      ...process.env,
      // Explicit values win over .env (dotenv never overrides them).
      DATABASE_URL: E2E_DATABASE_URL,
      SEED_USER_PASSWORD: E2E_USER_PASSWORD,
      ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
    },
  });
}

async function main() {
  await createDatabaseIfMissing();
  prisma("migrate", "deploy");
  prisma("db", "seed");
}

main().catch((error) => {
  console.error("[e2e] Could not prepare the e2e database:", error);
  process.exit(1);
});
