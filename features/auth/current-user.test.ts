import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "./current-user";

const findUnique = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: { user: { findUnique } } }));
vi.mock("next/server", () => ({ connection: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  findUnique.mockReset();
});

describe("getCurrentUser", () => {
  it("returns the seeded user during development", async () => {
    findUnique.mockResolvedValue({ id: "u1", name: "Granate" });
    await expect(getCurrentUser()).resolves.toEqual({
      id: "u1",
      name: "Granate",
    });
  });

  it("refuses the development bypass in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(getCurrentUser()).rejects.toThrow(/production/);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("fails clearly when the seed has not been run", async () => {
    findUnique.mockResolvedValue(null);
    await expect(getCurrentUser()).rejects.toThrow(/seed/);
  });
});
