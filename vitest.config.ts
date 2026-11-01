import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    setupFiles: ["dotenv/config"],
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", "generated"],
  },
});
